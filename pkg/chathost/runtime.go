package chathost

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/go-go-golems/geppetto/pkg/inference/engine/factory"
	geptools "github.com/go-go-golems/geppetto/pkg/inference/tools"
	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	"github.com/go-go-golems/geppetto/pkg/turns"
	"github.com/go-go-golems/geppetto/pkg/turns/serde"
	chatapp "github.com/go-go-golems/pinocchio/pkg/chatapp"
	"github.com/go-go-golems/pinocchio/pkg/chatapp/frontendtools"
	widgetv1 "github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/widgets/v1"
	"github.com/go-go-golems/pinocchio/pkg/chatapp/widgets"
	infruntime "github.com/go-go-golems/pinocchio/pkg/inference/runtime"
	"github.com/go-go-golems/pinocchio/pkg/persistence/chatstore"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"google.golang.org/protobuf/types/known/structpb"

	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
)

// EffectiveSettings resolves this host's default-profile inference settings the
// same way promptRequest does, for diagnostics (--print-inference-settings).
func (h *Host) EffectiveSettings(ctx context.Context) (*aisettings.InferenceSettings, error) {
	resolved, err := h.opts.Profiles.Registry.ResolveEngineProfile(ctx, gepprofiles.ResolveInput{
		RegistrySlug:      h.opts.Profiles.RegistrySlug,
		EngineProfileSlug: h.opts.Profiles.DefaultProfileSlug,
	})
	if err != nil {
		return nil, errors.Wrapf(err, "resolve engine profile %q", h.opts.Profiles.DefaultProfileSlug)
	}
	return gepprofiles.MergeInferenceSettings(h.opts.Profiles.BaseSettings, resolved.InferenceSettings)
}

// AppID returns the app id this host serves.
func (h *Host) AppID() string { return h.opts.AppID }

// promptRequest builds the per-prompt chatapp request: resolve the session's
// engine profile to inference settings, build a geppetto engine, register
// backend + frontend tools, and seed the system prompt on the session's first
// turn.
func (h *Host) promptRequest(ctx context.Context, sid sessionstream.SessionId, prompt string) (chatapp.PromptRequest, error) {
	slug := h.sessionProfile(sid)
	// ResolveEngineProfile flattens profile stacks (base profiles carrying API
	// keys/api-type under leaf profiles carrying engine choices); reading the
	// raw profile would drop the stacked base settings.
	resolved, err := h.opts.Profiles.Registry.ResolveEngineProfile(ctx, gepprofiles.ResolveInput{
		RegistrySlug:      h.opts.Profiles.RegistrySlug,
		EngineProfileSlug: slug,
	})
	if err != nil {
		return chatapp.PromptRequest{}, errors.Wrapf(err, "resolve engine profile %q", slug)
	}
	settings, err := gepprofiles.MergeInferenceSettings(h.opts.Profiles.BaseSettings, resolved.InferenceSettings)
	if err != nil {
		return chatapp.PromptRequest{}, errors.Wrapf(err, "merge inference settings for profile %q", slug)
	}
	buildEngine := h.opts.EngineFactory
	if buildEngine == nil {
		buildEngine = factory.NewEngineFromSettings
	}
	engine, err := buildEngine(settings)
	if err != nil {
		return chatapp.PromptRequest{}, errors.Wrapf(err, "build engine for profile %q", slug)
	}

	registry := geptools.NewInMemoryToolRegistry()
	if h.opts.BackendTools != nil {
		if err := h.opts.BackendTools(sid, registry); err != nil {
			return chatapp.PromptRequest{}, errors.Wrap(err, "register backend tools")
		}
	}
	if h.frontendTools != nil {
		if err := h.frontendTools.RegisterManifestTools(sid, registry); err != nil {
			return chatapp.PromptRequest{}, errors.Wrap(err, "register frontend manifest tools")
		}
	}
	bridgeExecutor := frontendtools.NewBridgeExecutor(h.frontendTools, nil)

	initialTurn, err := h.initialTurnIfFirstMessage(ctx, sid, prompt)
	if err != nil {
		return chatapp.PromptRequest{}, err
	}

	runtimeKey := string(slug)
	persist := h.persistFinalTurn(sid, runtimeKey)
	onFinalTurn := func(t *turns.Turn) {
		persist(t)
		h.publishArtifactsFromTurn(sid, t)
	}
	return chatapp.PromptRequest{
		Prompt:      prompt,
		InitialTurn: initialTurn,
		OnFinalTurn: onFinalTurn,
		Runtime: &infruntime.ComposedRuntime{
			Engine:       engine,
			Registry:     registry,
			ToolExecutor: bridgeExecutor,
			RuntimeKey:   runtimeKey,
		},
		RuntimeContext: func(ctx context.Context, sid sessionstream.SessionId, messageID string, pub sessionstream.EventPublisher) context.Context {
			return frontendtools.WithBridgeContext(ctx, frontendtools.BridgeContext{SessionID: sid, MessageID: messageID, Publisher: pub})
		},
	}, nil
}

// initialTurnIfFirstMessage seeds the system prompt on a session's first turn.
// On later prompts chatapp loads the persisted accumulator turn (which already
// carries the system block) and appends the user prompt itself, so we return
// nil to use that path.
func (h *Host) initialTurnIfFirstMessage(ctx context.Context, sid sessionstream.SessionId, prompt string) (*turns.Turn, error) {
	systemPrompt := h.opts.SystemPrompt
	if h.opts.SystemPromptFunc != nil {
		systemPrompt = h.opts.SystemPromptFunc(sid)
	}
	systemPrompt = strings.TrimSpace(systemPrompt)
	if systemPrompt == "" {
		return nil, nil
	}
	if h.turnStore != nil {
		snapshot, err := h.turnStore.LoadLatestTurn(ctx, string(sid), "final")
		if err != nil {
			return nil, errors.Wrap(err, "check conversation history")
		}
		if snapshot != nil {
			return nil, nil
		}
	}
	turn := &turns.Turn{}
	turns.AppendBlocks(turn,
		turns.NewSystemTextBlock(systemPrompt),
		turns.NewUserTextBlock(prompt),
	)
	return turn, nil
}

// publishArtifactsFromTurn runs the app's ArtifactExtractor over the completed
// assistant text and publishes each returned widget as a ChatWidgetInstance on
// the session's timeline. It runs on the background inference goroutine, so it
// uses a background context (the request context is already gone).
func (h *Host) publishArtifactsFromTurn(sid sessionstream.SessionId, t *turns.Turn) {
	if h == nil || h.opts.ArtifactExtractor == nil || h.hub == nil || t == nil {
		return
	}
	text := assistantTextFromTurn(t)
	if strings.TrimSpace(text) == "" {
		return
	}
	artifacts := h.opts.ArtifactExtractor(text)
	for i, artifact := range artifacts {
		name := strings.TrimSpace(artifact.WidgetName)
		if name == "" {
			continue
		}
		props, err := structpb.NewStruct(artifact.Props)
		if err != nil {
			log.Error().Err(err).Str("app", h.opts.AppID).Str("session_id", string(sid)).Str("widget", name).Msg("encode widget artifact props")
			continue
		}
		instanceID := strings.TrimSpace(artifact.InstanceID)
		if instanceID == "" {
			instanceID = fmt.Sprintf("%s-artifact-%d-%d", sid, time.Now().UnixNano(), i)
		}
		payload := &widgetv1.WidgetInstanceStarted{
			InstanceId: instanceID,
			WidgetName: name,
			Status:     widgetv1.WidgetStatus_WIDGET_STATUS_READY,
			Props:      props,
		}
		if err := h.hub.Publish(context.Background(), sessionstream.Event{
			Name:      widgets.EventWidgetInstanceStarted,
			Payload:   payload,
			SessionId: sid,
		}); err != nil {
			log.Error().Err(err).Str("app", h.opts.AppID).Str("session_id", string(sid)).Str("widget", name).Msg("publish widget artifact")
		}
	}
}

// assistantTextFromTurn concatenates the LLM text blocks of a turn.
func assistantTextFromTurn(t *turns.Turn) string {
	if t == nil {
		return ""
	}
	var b strings.Builder
	for _, block := range t.Blocks {
		if block.Kind != turns.BlockKindLLMText {
			continue
		}
		text, _ := block.Payload[turns.PayloadKeyText].(string)
		if strings.TrimSpace(text) == "" {
			continue
		}
		if b.Len() > 0 {
			b.WriteString("\n")
		}
		b.WriteString(text)
	}
	return b.String()
}

func (h *Host) persistFinalTurn(sid sessionstream.SessionId, runtimeKey string) func(*turns.Turn) {
	return func(t *turns.Turn) {
		if h == nil || h.turnStore == nil || t == nil {
			return
		}
		payload, err := serde.ToYAML(t, serde.Options{})
		if err != nil {
			log.Error().Err(err).Str("app", h.opts.AppID).Str("session_id", string(sid)).Msg("serialize final turn")
			return
		}
		turnID := strings.TrimSpace(t.ID)
		if turnID == "" {
			turnID = fmt.Sprintf("turn-%d", time.Now().UnixNano())
		}
		if err := h.turnStore.Save(context.Background(), string(sid), string(sid), turnID, "final", time.Now().UnixMilli(), string(payload), chatstore.TurnSaveOptions{RuntimeKey: runtimeKey}); err != nil {
			log.Error().Err(err).Str("app", h.opts.AppID).Str("session_id", string(sid)).Str("turn_id", turnID).Msg("persist final turn")
		}
	}
}
