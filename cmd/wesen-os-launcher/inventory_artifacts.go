package main

import (
	_ "embed"
	"encoding/json"
	"regexp"
	"strings"

	"github.com/go-go-golems/wesen-os/pkg/chathost"
	"gopkg.in/yaml.v3"
)

// Widget names the Inventory chat window registers via defineWidget.
const (
	inventoryCardWidgetName     = "inventory.card"     // static display card
	inventoryCodeCardWidgetName = "inventory.codeCard" // generated JS runtime card
)

// Static cards ride <hypercard:widget:v1> (JSON body); generated JS runtime
// cards ride <hypercard:card:v2> (YAML body, optionally inside a ```yaml
// fence) — the same tag split the legacy pinoweb middleware used
// (pkg/_pinoweb_legacy/hypercard_extractors.go).
var (
	inventoryWidgetBlockPattern = regexp.MustCompile(`(?s)<hypercard:widget:v1>(.*?)</hypercard:widget:v1>`)
	inventoryCardBlockPattern   = regexp.MustCompile(`(?s)<hypercard:card:v2>(.*?)</hypercard:card:v2>`)
	yamlFencePattern            = regexp.MustCompile("(?s)^```(?:yaml|yml)?\\s*\\n(.*?)\\n?```$")
)

// maxCardBlockBytes mirrors the legacy extractor's cap — card.code can be
// large, but a runaway block should not be parsed (hypercard_extractors.go:48).
const maxCardBlockBytes = 128 << 10

//go:embed prompts/runtime-card-policy.md
var runtimeCardPolicy string

// inventorySystemPrompt instructs the inventory assistant: tool-first
// behavior, static display cards over <hypercard:widget:v1>, and the full JS
// runtime-card policy (ui.card.v1 / kanban.v1 DSL + sandbox rules) ported from
// the legacy pinoweb middleware.
var inventorySystemPrompt = "You are an inventory assistant. Be concise, accurate, and tool-first.\n\n" +
	"For a simple read-only summary card (for example a low-stock card, a product card, or a summary card) " +
	"when no interactivity is needed, include exactly one static card block in your reply, in addition to a " +
	"short sentence of plain text. Emit the block verbatim in this form:\n\n" +
	"<hypercard:widget:v1>\n" +
	`{"title":"...","subtitle":"...","fields":[{"label":"...","value":"..."}],"footer":"..."}` + "\n" +
	"</hypercard:widget:v1>\n\n" +
	"The block body must be a single valid JSON object. Only include a static card block when the user " +
	"actually asks for a card.\n\n" +
	"---\n\n" +
	runtimeCardPolicy

// inventoryRuntimeCardPayload is the <hypercard:card:v2> YAML schema
// (legacy hypercard_extractors.go:83-94).
type inventoryRuntimeCardPayload struct {
	Name     string `yaml:"name"`
	Title    string `yaml:"title"`
	Artifact struct {
		ID   string         `yaml:"id"`
		Data map[string]any `yaml:"data"`
	} `yaml:"artifact"`
	Runtime struct {
		Pack string `yaml:"pack"`
	} `yaml:"runtime"`
	Card struct {
		ID   string `yaml:"id"`
		Code string `yaml:"code"`
	} `yaml:"card"`
}

// extractInventoryArtifacts parses static widget blocks and generated runtime
// card blocks out of a completed assistant reply. Malformed blocks are skipped
// rather than failing the turn (final-only v1; streaming extraction is a
// future WrapSink extension — see ticket WESEN-OS-ASSISTANT-PARITY-2026-07).
func extractInventoryArtifacts(assistantText string) []chathost.WidgetArtifact {
	var artifacts []chathost.WidgetArtifact
	artifacts = append(artifacts, extractStaticCards(assistantText)...)
	artifacts = append(artifacts, extractRuntimeCards(assistantText)...)
	return artifacts
}

// extractStaticCards parses <hypercard:widget:v1> JSON blocks into
// inventory.card widgets.
func extractStaticCards(assistantText string) []chathost.WidgetArtifact {
	matches := inventoryWidgetBlockPattern.FindAllStringSubmatch(assistantText, -1)
	if len(matches) == 0 {
		return nil
	}
	artifacts := make([]chathost.WidgetArtifact, 0, len(matches))
	for _, m := range matches {
		body := strings.TrimSpace(m[1])
		if body == "" {
			continue
		}
		var props map[string]any
		if err := json.Unmarshal([]byte(body), &props); err != nil {
			continue
		}
		artifacts = append(artifacts, chathost.WidgetArtifact{
			WidgetName: inventoryCardWidgetName,
			Props:      props,
		})
	}
	return artifacts
}

// extractRuntimeCards parses <hypercard:card:v2> YAML blocks into
// inventory.codeCard widgets carrying the executable card verbatim:
// { title, name, artifact:{id,data}, runtime:{pack}, card:{id,code} }.
// Required fields mirror the legacy validation
// (hypercard_extractors.go:306-326): display name, card.id, card.code,
// runtime.pack.
func extractRuntimeCards(assistantText string) []chathost.WidgetArtifact {
	matches := inventoryCardBlockPattern.FindAllStringSubmatch(assistantText, -1)
	if len(matches) == 0 {
		return nil
	}
	artifacts := make([]chathost.WidgetArtifact, 0, len(matches))
	for _, m := range matches {
		body := strings.TrimSpace(m[1])
		if body == "" || len(body) > maxCardBlockBytes {
			continue
		}
		if fence := yamlFencePattern.FindStringSubmatch(body); fence != nil {
			body = strings.TrimSpace(fence[1])
		}
		var payload inventoryRuntimeCardPayload
		if err := yaml.Unmarshal([]byte(body), &payload); err != nil {
			continue
		}
		name := strings.TrimSpace(payload.Name)
		title := strings.TrimSpace(payload.Title)
		displayName := name
		if displayName == "" {
			displayName = title
		}
		cardID := strings.TrimSpace(payload.Card.ID)
		cardCode := strings.TrimSpace(payload.Card.Code)
		runtimePack := strings.TrimSpace(payload.Runtime.Pack)
		if displayName == "" || cardID == "" || cardCode == "" || runtimePack == "" {
			continue
		}
		artifactID := strings.TrimSpace(payload.Artifact.ID)
		instanceID := artifactID
		if instanceID == "" {
			instanceID = cardID
		}
		var artifactData map[string]any
		if payload.Artifact.Data != nil {
			artifactData = payload.Artifact.Data
		} else {
			artifactData = map[string]any{}
		}
		artifacts = append(artifacts, chathost.WidgetArtifact{
			InstanceID: "codecard-" + instanceID,
			WidgetName: inventoryCodeCardWidgetName,
			Props: map[string]any{
				"title": title,
				"name":  name,
				"artifact": map[string]any{
					"id":   artifactID,
					"data": artifactData,
				},
				"runtime": map[string]any{
					"pack": runtimePack,
				},
				"card": map[string]any{
					"id":   cardID,
					"code": cardCode,
				},
			},
		})
	}
	return artifacts
}
