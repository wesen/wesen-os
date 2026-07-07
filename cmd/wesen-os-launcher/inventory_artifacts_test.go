package main

import (
	"strings"
	"testing"
)

const validCardBlock = "Here is your card.\n<hypercard:card:v2>\n```yaml\n" +
	"name: Stock Overview\n" +
	"title: Inventory Stock Overview\n" +
	"artifact:\n  id: stock-overview\n  data: {}\n" +
	"runtime:\n  pack: ui.card.v1\n" +
	"card:\n  id: stockOverview\n  code: |-\n    ({ ui }) => ({\n      render() { return ui.panel([ ui.text(\"Hello\") ]); }\n    })\n" +
	"```\n</hypercard:card:v2>\n"

func TestExtractRuntimeCards_ValidYAMLFencedBlock(t *testing.T) {
	artifacts := extractInventoryArtifacts(validCardBlock)
	if len(artifacts) != 1 {
		t.Fatalf("expected 1 artifact, got %d", len(artifacts))
	}
	a := artifacts[0]
	if a.WidgetName != inventoryCodeCardWidgetName {
		t.Fatalf("widget name = %q, want %q", a.WidgetName, inventoryCodeCardWidgetName)
	}
	if a.InstanceID != "codecard-stock-overview" {
		t.Fatalf("instance id = %q", a.InstanceID)
	}
	card, ok := a.Props["card"].(map[string]any)
	if !ok {
		t.Fatalf("props.card missing: %#v", a.Props)
	}
	if card["id"] != "stockOverview" {
		t.Fatalf("card.id = %v", card["id"])
	}
	code, _ := card["code"].(string)
	if !strings.Contains(code, "ui.panel") {
		t.Fatalf("card.code lost: %q", code)
	}
	runtime, ok := a.Props["runtime"].(map[string]any)
	if !ok || runtime["pack"] != "ui.card.v1" {
		t.Fatalf("runtime.pack = %#v", a.Props["runtime"])
	}
}

func TestExtractRuntimeCards_UnfencedYAML(t *testing.T) {
	block := "<hypercard:card:v2>\nname: X\ntitle: Y\nruntime:\n  pack: kanban.v1\ncard:\n  id: xCard\n  code: \"({ widgets }) => ({ render() { return widgets.kanban.board({}) } })\"\n</hypercard:card:v2>"
	artifacts := extractInventoryArtifacts(block)
	if len(artifacts) != 1 {
		t.Fatalf("expected 1 artifact, got %d", len(artifacts))
	}
	if artifacts[0].InstanceID != "codecard-xCard" { // no artifact.id -> card.id
		t.Fatalf("instance id = %q", artifacts[0].InstanceID)
	}
}

func TestExtractRuntimeCards_RejectsMissingRequiredFields(t *testing.T) {
	cases := map[string]string{
		"no code": "<hypercard:card:v2>\nname: X\nruntime:\n  pack: ui.card.v1\ncard:\n  id: xCard\n</hypercard:card:v2>",
		"no pack": "<hypercard:card:v2>\nname: X\ncard:\n  id: xCard\n  code: \"({ui})=>({render(){return ui.text('x')}})\"\n</hypercard:card:v2>",
		"no id":   "<hypercard:card:v2>\nname: X\nruntime:\n  pack: ui.card.v1\ncard:\n  code: \"({ui})=>({render(){return ui.text('x')}})\"\n</hypercard:card:v2>",
		"no name": "<hypercard:card:v2>\nruntime:\n  pack: ui.card.v1\ncard:\n  id: xCard\n  code: \"({ui})=>({render(){return ui.text('x')}})\"\n</hypercard:card:v2>",
	}
	for label, block := range cases {
		if got := extractInventoryArtifacts(block); len(got) != 0 {
			t.Fatalf("%s: expected rejection, got %d artifacts", label, len(got))
		}
	}
}

func TestExtractStaticCards_WidgetV1JSON(t *testing.T) {
	text := "Sure.\n<hypercard:widget:v1>\n{\"title\":\"Low stock\",\"fields\":[{\"label\":\"Widgets\",\"value\":\"3\"}]}\n</hypercard:widget:v1>"
	artifacts := extractInventoryArtifacts(text)
	if len(artifacts) != 1 {
		t.Fatalf("expected 1 artifact, got %d", len(artifacts))
	}
	if artifacts[0].WidgetName != inventoryCardWidgetName {
		t.Fatalf("widget name = %q", artifacts[0].WidgetName)
	}
	if artifacts[0].Props["title"] != "Low stock" {
		t.Fatalf("title = %v", artifacts[0].Props["title"])
	}
}

func TestExtractInventoryArtifacts_MixedBlocks(t *testing.T) {
	text := "static:\n<hypercard:widget:v1>\n{\"title\":\"A\"}\n</hypercard:widget:v1>\nand runtime:\n" + validCardBlock
	artifacts := extractInventoryArtifacts(text)
	if len(artifacts) != 2 {
		t.Fatalf("expected 2 artifacts, got %d", len(artifacts))
	}
}

func TestSystemPromptCarriesBothPolicies(t *testing.T) {
	if !strings.Contains(inventorySystemPrompt, "<hypercard:widget:v1>") {
		t.Fatal("system prompt lost the static widget instructions")
	}
	if !strings.Contains(inventorySystemPrompt, "<hypercard:card:v2>") {
		t.Fatal("system prompt lost the runtime card policy")
	}
	if !strings.Contains(inventorySystemPrompt, "ui.card.v1") || !strings.Contains(inventorySystemPrompt, "kanban.v1") {
		t.Fatal("system prompt lost the pack selection rules")
	}
}
