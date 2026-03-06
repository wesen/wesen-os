package assistantbackendmodule

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	profilechat "github.com/go-go-golems/go-go-os-chat/pkg/profilechat"
	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
	"github.com/go-go-golems/go-go-os-backend/pkg/docmw"
)

var errAppChatContextAppNotFound = errors.New("app not found")

type AppChatBootstrapContext struct {
	profilechat.ConversationContext
	AppID         string
	Name          string
	Description   string
	DocsCount     int
	HasReflection bool
}

func ResolveAppChatContext(ctx context.Context, registry *backendhost.ModuleRegistry, appID string) (*AppChatBootstrapContext, error) {
	appID = strings.TrimSpace(appID)
	if registry == nil {
		return nil, fmt.Errorf("module registry is not initialized")
	}
	module, ok := registry.Get(appID)
	if !ok {
		return nil, fmt.Errorf("%w: %s", errAppChatContextAppNotFound, appID)
	}

	manifest := module.Manifest()
	documentable, _ := module.(backendhost.DocumentableAppBackendModule)
	reflective, _ := module.(backendhost.ReflectiveAppBackendModule)

	var docsText string
	var docsCount int
	if documentable != nil {
		docsText, docsCount = renderDocContext(documentable.DocStore())
	}

	var reflectionText string
	hasReflection := false
	if reflective != nil {
		reflectionDoc, err := reflective.Reflection(ctx)
		if err != nil {
			return nil, fmt.Errorf("resolve reflection for %s: %w", appID, err)
		}
		if reflectionDoc != nil {
			hasReflection = true
			reflectionText = renderReflectionContext(reflectionDoc)
		}
	}

	addendum := buildSystemPromptAddendum(manifest, docsText, reflectionText)
	return &AppChatBootstrapContext{
		ConversationContext: profilechat.ConversationContext{
			SystemPromptAddendum: addendum,
			Metadata: map[string]any{
				"subject_app_id":   strings.TrimSpace(manifest.AppID),
				"subject_app_name": strings.TrimSpace(manifest.Name),
				"docs_count":       docsCount,
				"has_reflection":   hasReflection,
			},
		},
		AppID:         strings.TrimSpace(manifest.AppID),
		Name:          strings.TrimSpace(manifest.Name),
		Description:   strings.TrimSpace(manifest.Description),
		DocsCount:     docsCount,
		HasReflection: hasReflection,
	}, nil
}

func renderDocContext(store *docmw.DocStore) (string, int) {
	if store == nil || store.Count() == 0 {
		return "", 0
	}
	var b strings.Builder
	count := 0
	for _, tocDoc := range store.TOC() {
		doc, ok := store.Get(tocDoc.Slug)
		if !ok || doc == nil {
			continue
		}
		count++
		b.WriteString("## ")
		b.WriteString(strings.TrimSpace(doc.Title))
		b.WriteString("\n")
		b.WriteString("- slug: ")
		b.WriteString(strings.TrimSpace(doc.Slug))
		b.WriteString("\n")
		b.WriteString("- doc_type: ")
		b.WriteString(strings.TrimSpace(doc.DocType))
		b.WriteString("\n")
		if summary := strings.TrimSpace(doc.Summary); summary != "" {
			b.WriteString("- summary: ")
			b.WriteString(summary)
			b.WriteString("\n")
		}
		if len(doc.Topics) > 0 {
			b.WriteString("- topics: ")
			b.WriteString(strings.Join(doc.Topics, ", "))
			b.WriteString("\n")
		}
		content := strings.TrimSpace(doc.Content)
		if content != "" {
			b.WriteString("content:\n")
			b.WriteString(content)
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}
	return strings.TrimSpace(b.String()), count
}

func renderReflectionContext(doc *backendhost.ModuleReflectionDocument) string {
	if doc == nil {
		return ""
	}
	b, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return ""
	}
	return string(b)
}

func buildSystemPromptAddendum(manifest backendhost.AppBackendManifest, docsText string, reflectionText string) string {
	var sections []string
	sections = append(sections,
		fmt.Sprintf(
			"Selected app context.\nApp ID: %s\nName: %s\nDescription: %s",
			strings.TrimSpace(manifest.AppID),
			strings.TrimSpace(manifest.Name),
			strings.TrimSpace(manifest.Description),
		),
		"When answering, treat the attached app documentation and reflection as the primary source of truth for this conversation. If the answer is not in the attached material, say so clearly.",
	)
	if strings.TrimSpace(docsText) != "" {
		sections = append(sections, "Attached documentation:\n"+strings.TrimSpace(docsText))
	}
	if strings.TrimSpace(reflectionText) != "" {
		sections = append(sections, "Attached reflection:\n```json\n"+strings.TrimSpace(reflectionText)+"\n```")
	}
	return strings.Join(sections, "\n\n")
}
