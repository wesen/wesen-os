package assistantbackendmodule

import (
	"context"
	"sync"

	"github.com/google/uuid"
)

// ConversationContext carries per-conversation system-prompt additions created
// by the app-chat bootstrap endpoint ("chat about this app" flows).
//
// It was previously go-go-os-chat/pkg/profilechat.ConversationContext; the
// type moved here when the assistant switched from pinocchio webchat to
// chatapp/sessionstream (WESEN-OS-STOCKTAKE-2026-07 Decision D3).
type ConversationContext struct {
	SystemPromptAddendum string
	Metadata             map[string]any
}

type AppChatContextStore struct {
	mu       sync.RWMutex
	byConvID map[string]*ConversationContext
}

func NewAppChatContextStore() *AppChatContextStore {
	return &AppChatContextStore{
		byConvID: map[string]*ConversationContext{},
	}
}

func (s *AppChatContextStore) Create(convContext ConversationContext) string {
	if s == nil {
		return ""
	}
	convID := uuid.NewString()
	s.mu.Lock()
	defer s.mu.Unlock()
	copyValue := convContext
	s.byConvID[convID] = &copyValue
	return convID
}

func (s *AppChatContextStore) Lookup(_ context.Context, convID string) (*ConversationContext, error) {
	if s == nil {
		return nil, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	ctxValue, ok := s.byConvID[convID]
	if !ok || ctxValue == nil {
		return nil, nil
	}
	copyValue := *ctxValue
	return &copyValue, nil
}
