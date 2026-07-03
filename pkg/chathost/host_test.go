package chathost

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
	"github.com/go-go-golems/geppetto/pkg/events"
	gepengine "github.com/go-go-golems/geppetto/pkg/inference/engine"
	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	"github.com/go-go-golems/geppetto/pkg/turns"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// fakeEngine emits a canonical text-segment lifecycle and appends an assistant
// block, imitating a streaming provider engine. It records the turns it
// receives so tests can assert history and system-prompt seeding.
type fakeEngine struct {
	mu    sync.Mutex
	reply string
	seen  []*turns.Turn
}

var _ gepengine.Engine = (*fakeEngine)(nil)

func (e *fakeEngine) RunInference(ctx context.Context, t *turns.Turn) (*turns.Turn, error) {
	e.mu.Lock()
	e.seen = append(e.seen, t.Clone())
	e.mu.Unlock()

	md := events.EventMetadata{ID: uuid.New()}
	corr := events.Correlation{SegmentID: uuid.NewString()}
	events.PublishEventToContext(ctx, events.NewTextSegmentStartedEvent(md, corr, "assistant"))
	events.PublishEventToContext(ctx, events.NewTextDeltaEvent(md, corr, e.reply, e.reply, 0))
	events.PublishEventToContext(ctx, events.NewTextSegmentFinishedEvent(md, corr, e.reply, "stop"))

	turns.AppendBlock(t, turns.NewAssistantTextBlock(e.reply))
	return t, nil
}

func (e *fakeEngine) seenTurns() []*turns.Turn {
	e.mu.Lock()
	defer e.mu.Unlock()
	return append([]*turns.Turn(nil), e.seen...)
}

func newTestHost(t *testing.T, engine gepengine.Engine, systemPrompt string) *Host {
	t.Helper()
	registrySlug := gepprofiles.MustRegistrySlug("test")
	profileSlug := gepprofiles.MustEngineProfileSlug("default")

	store := gepprofiles.NewInMemoryEngineProfileStore()
	require.NoError(t, store.UpsertRegistry(context.Background(), &gepprofiles.EngineProfileRegistry{
		Slug:                     registrySlug,
		DefaultEngineProfileSlug: profileSlug,
		Profiles: map[gepprofiles.EngineProfileSlug]*gepprofiles.EngineProfile{
			profileSlug: {
				Slug:              profileSlug,
				InferenceSettings: &aisettings.InferenceSettings{},
			},
		},
	}, gepprofiles.SaveOptions{}))
	registry, err := gepprofiles.NewStoreRegistry(store, registrySlug)
	require.NoError(t, err)

	host, err := New(Options{
		AppID:        "testapp",
		SystemPrompt: systemPrompt,
		Profiles: ProfileSurface{
			Registry:           registry,
			RegistrySlug:       registrySlug,
			DefaultProfileSlug: profileSlug,
		},
		EngineFactory: func(*aisettings.InferenceSettings) (gepengine.Engine, error) {
			return engine, nil
		},
		ChunkDelay: time.Millisecond,
	})
	require.NoError(t, err)
	t.Cleanup(func() { _ = host.Close() })
	return host
}

type snapshotEntity struct {
	Kind           string         `json:"kind"`
	ID             string         `json:"id"`
	CreatedOrdinal string         `json:"createdOrdinal"`
	Payload        map[string]any `json:"payload"`
}

type snapshotResponse struct {
	SessionID string           `json:"sessionId"`
	Entities  []snapshotEntity `json:"entities"`
}

func createSession(t *testing.T, srv *httptest.Server, body string) string {
	t.Helper()
	resp, err := http.Post(srv.URL+"/api/chat/sessions", "application/json", bytes.NewReader([]byte(body)))
	require.NoError(t, err)
	defer func() { _ = resp.Body.Close() }()
	require.Equal(t, http.StatusOK, resp.StatusCode)
	var out struct {
		SessionID string `json:"sessionId"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&out))
	require.NotEmpty(t, out.SessionID)
	return out.SessionID
}

func submitAndWait(t *testing.T, srv *httptest.Server, host *Host, sid string, prompt string) {
	t.Helper()
	resp, err := http.Post(
		srv.URL+"/api/chat/sessions/"+sid+"/messages",
		"application/json",
		bytes.NewReader([]byte(fmt.Sprintf(`{"prompt":%q}`, prompt))),
	)
	require.NoError(t, err)
	defer func() { _ = resp.Body.Close() }()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	require.NoError(t, host.Service().WaitIdle(ctx, sessionstream.SessionId(sid)))
}

func fetchSnapshot(t *testing.T, srv *httptest.Server, sid string) snapshotResponse {
	t.Helper()
	resp, err := http.Get(srv.URL + "/api/chat/sessions/" + sid)
	require.NoError(t, err)
	defer func() { _ = resp.Body.Close() }()
	require.Equal(t, http.StatusOK, resp.StatusCode)
	var snap snapshotResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&snap))
	return snap
}

// TestChatContract_PromptRoundTrip drives the chat-provider wire contract end
// to end: create session, submit prompt, wait idle, snapshot. It asserts the
// timeline contains the accepted user message followed by the assistant reply
// produced from canonical text-segment events.
func TestChatContract_PromptRoundTrip(t *testing.T) {
	engine := &fakeEngine{reply: "hello from fake"}
	host := newTestHost(t, engine, "you are a test assistant")

	mux := http.NewServeMux()
	require.NoError(t, host.MountRoutes(mux))
	srv := httptest.NewServer(mux)
	defer srv.Close()

	sid := createSession(t, srv, `{}`)
	submitAndWait(t, srv, host, sid, "hi")

	snap := fetchSnapshot(t, srv, sid)
	require.Equal(t, sid, snap.SessionID)

	var userEntity, assistantEntity *snapshotEntity
	for i := range snap.Entities {
		e := &snap.Entities[i]
		if e.Kind != "ChatMessage" {
			continue
		}
		switch e.Payload["role"] {
		case "user":
			userEntity = e
		case "assistant":
			assistantEntity = e
		}
	}
	require.NotNil(t, userEntity, "expected user ChatMessage entity: %#v", snap.Entities)
	require.NotNil(t, assistantEntity, "expected assistant ChatMessage entity: %#v", snap.Entities)
	require.Equal(t, "hi", userEntity.Payload["text"])
	require.Contains(t, assistantEntity.Payload["text"], "hello from fake")
	require.Less(t, userEntity.CreatedOrdinal, assistantEntity.CreatedOrdinal)
}

// TestChatContract_SystemPromptSeededOnceAndHistoryAccumulates asserts the two
// core semantics of the turn-store history model: the system prompt appears as
// the first block of the first turn only, and the second prompt sees the full
// prior conversation (system + user + assistant + new user).
func TestChatContract_SystemPromptSeededOnceAndHistoryAccumulates(t *testing.T) {
	engine := &fakeEngine{reply: "ack"}
	host := newTestHost(t, engine, "system rules here")

	mux := http.NewServeMux()
	require.NoError(t, host.MountRoutes(mux))
	srv := httptest.NewServer(mux)
	defer srv.Close()

	sid := createSession(t, srv, `{}`)
	submitAndWait(t, srv, host, sid, "first")
	submitAndWait(t, srv, host, sid, "second")

	seen := engine.seenTurns()
	require.Len(t, seen, 2)

	firstBlocks := seen[0].Blocks
	require.GreaterOrEqual(t, len(firstBlocks), 2)
	require.Equal(t, turns.BlockKindSystem, firstBlocks[0].Kind)
	require.Equal(t, "system rules here", firstBlocks[0].Payload[turns.PayloadKeyText])
	require.Equal(t, turns.BlockKindUser, firstBlocks[1].Kind)

	secondBlocks := seen[1].Blocks
	require.GreaterOrEqual(t, len(secondBlocks), 4, "second turn must carry full history")
	require.Equal(t, turns.BlockKindSystem, secondBlocks[0].Kind, "system prompt must not be re-seeded")
	kinds := map[turns.BlockKind]int{}
	for _, b := range secondBlocks {
		kinds[b.Kind]++
	}
	require.Equal(t, 1, kinds[turns.BlockKindSystem], "exactly one system block after two prompts")
	require.Equal(t, 2, kinds[turns.BlockKindUser])
	require.GreaterOrEqual(t, kinds[turns.BlockKindLLMText], 1)
}

// TestChatContract_SessionProfileSelection asserts that a profile slug carried
// in createSessionBody selects the engine profile for the session, and an
// unknown profile is rejected at create time.
func TestChatContract_SessionProfileSelection(t *testing.T) {
	engine := &fakeEngine{reply: "ok"}
	host := newTestHost(t, engine, "")

	mux := http.NewServeMux()
	require.NoError(t, host.MountRoutes(mux))
	srv := httptest.NewServer(mux)
	defer srv.Close()

	// Known profile accepted.
	sid := createSession(t, srv, `{"profile":"default"}`)
	submitAndWait(t, srv, host, sid, "hi")
	require.Len(t, engine.seenTurns(), 1)

	// Malformed profile slug rejected.
	resp, err := http.Post(srv.URL+"/api/chat/sessions", "application/json",
		bytes.NewReader([]byte(`{"profile":"NOT A SLUG!!"}`)))
	require.NoError(t, err)
	defer func() { _ = resp.Body.Close() }()
	require.Equal(t, http.StatusBadRequest, resp.StatusCode)
}
