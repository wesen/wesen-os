package main

import (
	"encoding/json"
	"regexp"
	"strings"

	"github.com/go-go-golems/wesen-os/pkg/chathost"
)

// inventoryCardWidgetName is the frontend defineWidget name the Inventory chat
// window registers to render generated cards.
const inventoryCardWidgetName = "inventory.card"

// inventoryCardBlockPattern matches a structured card block the model is asked
// to emit (see inventorySystemPrompt). The body is a JSON object rendered by the
// inventory.card widget. Non-greedy across newlines so multiple cards in one
// turn are each captured.
var inventoryCardBlockPattern = regexp.MustCompile(`(?s)<hypercard:card:v2>(.*?)</hypercard:card:v2>`)

// inventorySystemPrompt instructs the inventory assistant to emit generated
// cards as structured blocks that extractInventoryCards turns into widgets.
const inventorySystemPrompt = "You are an inventory assistant. Be concise, accurate, and tool-first.\n\n" +
	"When the user asks you to generate, show, or render a card (for example a low-stock card, a product card, or a summary card), " +
	"include exactly one structured card block in your reply, in addition to a short sentence of plain text. " +
	"Emit the block verbatim in this form:\n\n" +
	"<hypercard:card:v2>\n" +
	`{"title":"...","subtitle":"...","fields":[{"label":"...","value":"..."}],"footer":"..."}` + "\n" +
	"</hypercard:card:v2>\n\n" +
	"The block body must be a single valid JSON object. Only include a card block when the user actually asks for a card."

// extractInventoryCards parses inventory card blocks out of an assistant reply
// and returns them as widget artifacts for chathost to publish. Malformed JSON
// bodies are skipped rather than failing the turn.
func extractInventoryCards(assistantText string) []chathost.WidgetArtifact {
	matches := inventoryCardBlockPattern.FindAllStringSubmatch(assistantText, -1)
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
