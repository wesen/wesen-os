package chathost

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/go-go-golems/geppetto/pkg/inference/engine/factory"
	geptools "github.com/go-go-golems/geppetto/pkg/inference/tools"
	"github.com/go-go-golems/geppetto/pkg/turns"
	"github.com/go-go-golems/geppetto/pkg/turns/serde"
	chatapp "github.com/go-go-golems/pinocchio/pkg/chatapp"
	"github.com/go-go-golems/pinocchio/pkg/chatapp/frontendtools"
	infruntime "github.com/go-go-golems/pinocchio/pkg/inference/runtime"
	"github.com/go-go-golems/pinocchio/pkg/persistence/chatstore"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"

	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
)

// promptRequest builds the per-prompt chatapp request: resolve the session's
// engine profile to inference settings, build a geppetto engine, register
// backend + frontend tools, and seed the system prompt on the session's first
// turn.
func (h *Host) promptRequest(ctx context.Context, sid sessionstream.SessionId, prompt string) (chatapp.PromptRequest, error) {
	slug := h.sessionProfile(sid)
	profile, err := h.opts.Profiles.Registry.GetEngineProfile(ctx, h.opts.Profiles.RegistrySlug, slug)
	if err != nil {
		return chatapp.PromptRequest{}, errors.Wrapf(err, "resolve engine profile %q", slug)
	}
	settings, err := gepprofiles.MergeInferenceSettings(h.opts.Profiles.BaseSettings, profile.InferenceSettings)
	if err != nil {
		return chatapp.PromptRequest{}, errors.Wrapf(err, "merge inference settings for profile %q", slug)
	}
	engine, err := factory.NewEngineFromSettings(settings)
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
	return chatapp.PromptRequest{
		Prompt:      prompt,
		InitialTurn: initialTurn,
		OnFinalTurn: h.persistFinalTurn(sid, runtimeKey),
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
