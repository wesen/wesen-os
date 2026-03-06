package assistantbackendmodule

import (
	"context"
	"sync"

	profilechat "github.com/go-go-golems/go-go-os-chat/pkg/profilechat"
	"github.com/google/uuid"
)

type AppChatContextStore struct {
	mu        sync.RWMutex
	byConvID  map[string]*profilechat.ConversationContext
}

func NewAppChatContextStore() *AppChatContextStore {
	return &AppChatContextStore{
		byConvID: map[string]*profilechat.ConversationContext{},
	}
}

func (s *AppChatContextStore) Create(convContext profilechat.ConversationContext) string {
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

func (s *AppChatContextStore) Lookup(_ context.Context, convID string) (*profilechat.ConversationContext, error) {
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
