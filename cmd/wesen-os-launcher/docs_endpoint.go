package main

import (
	"context"
	"encoding/json"
	"net/http"
	"sort"
	"strings"

	"github.com/go-go-golems/glazed/pkg/help"
	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
	"github.com/go-go-golems/go-go-os-backend/pkg/docmw"
	wesendoc "github.com/go-go-golems/wesen-os/pkg/doc"
)

type osDocResult struct {
	ModuleID string   `json:"module_id"`
	Slug     string   `json:"slug"`
	Title    string   `json:"title"`
	DocType  string   `json:"doc_type"`
	Topics   []string `json:"topics,omitempty"`
	Summary  string   `json:"summary,omitempty"`
	URL      string   `json:"url"`
}

type osDocsFacet struct {
	Slug  string `json:"slug"`
	Count int    `json:"count"`
}

type osDocsModuleFacet struct {
	ID    string `json:"id"`
	Count int    `json:"count"`
}

type osDocsResponse struct {
	Total   int           `json:"total"`
	Results []osDocResult `json:"results"`
	Facets  struct {
		Topics   []osDocsFacet       `json:"topics"`
		DocTypes []osDocsFacet       `json:"doc_types"`
		Modules  []osDocsModuleFacet `json:"modules"`
	} `json:"facets"`
}

const launcherHelpModuleID = "wesen-os"

func loadLauncherHelpDocStore() *docmw.DocStore {
	helpSystem := help.NewHelpSystem()
	if err := wesendoc.AddDocToHelpSystem(helpSystem); err != nil {
		return nil
	}

	sections, err := helpSystem.Store.List(context.Background(), "order_num ASC")
	if err != nil {
		return nil
	}

	docs := make([]docmw.ModuleDoc, 0, len(sections))
	for _, section := range sections {
		slug := strings.TrimSpace(section.Slug)
		title := strings.TrimSpace(section.Title)
		if slug == "" || title == "" {
			continue
		}
		docs = append(docs, docmw.ModuleDoc{
			ModuleID: launcherHelpModuleID,
			Slug:     slug,
			Title:    title,
			DocType:  mapHelpSectionType(section.SectionType),
			Topics:   append([]string(nil), section.Topics...),
			Summary:  strings.TrimSpace(section.Short),
			Order:    section.Order,
			Content:  strings.TrimSpace(section.Content),
		})
	}
	store, err := docmw.NewDocStore(launcherHelpModuleID, docs)
	if err != nil {
		return nil
	}
	return store
}

func mapHelpSectionType(sectionType help.SectionType) string {
	switch sectionType {
	case help.SectionTutorial:
		return "tutorial"
	case help.SectionExample:
		return "example"
	case help.SectionApplication:
		return "application"
	default:
		return "guide"
	}
}

func registerOSHelpEndpoint(mux *http.ServeMux, store *docmw.DocStore) {
	if mux == nil {
		return
	}
	if store == nil {
		emptyStore, err := docmw.NewDocStore(launcherHelpModuleID, nil)
		if err != nil {
			return
		}
		store = emptyStore
	}

	mux.HandleFunc("/api/os/help", func(w http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		osWriteJSON(w, struct {
			ModuleID string            `json:"module_id"`
			Docs     []docmw.ModuleDoc `json:"docs"`
		}{
			ModuleID: store.ModuleID,
			Docs:     store.TOC(),
		})
	})

	mux.HandleFunc("/api/os/help/", func(w http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		slug := strings.TrimPrefix(req.URL.Path, "/api/os/help/")
		slug = strings.TrimSpace(slug)
		if slug == "" || strings.Contains(slug, "/") {
			http.NotFound(w, req)
			return
		}
		doc, ok := store.Get(slug)
		if !ok {
			http.NotFound(w, req)
			return
		}
		osWriteJSON(w, doc)
	})
}

func registerOSDocsEndpoint(mux *http.ServeMux, registry *backendhost.ModuleRegistry, launcherHelpStore *docmw.DocStore) {
	if mux == nil || registry == nil {
		return
	}
	mux.HandleFunc("/api/os/docs", func(w http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		query := strings.ToLower(strings.TrimSpace(req.URL.Query().Get("query")))
		moduleFilter := csvSet(req.URL.Query().Get("module"))
		docTypeFilter := csvSet(req.URL.Query().Get("doc_type"))
		topicFilter := csvSet(req.URL.Query().Get("topics"))

		results := make([]osDocResult, 0, 48)
		for _, module := range registry.Modules() {
			documentable, ok := module.(backendhost.DocumentableAppBackendModule)
			if !ok {
				continue
			}
			store := documentable.DocStore()
			if store == nil {
				continue
			}
			manifest := module.Manifest()
			moduleID := strings.TrimSpace(manifest.AppID)
			if len(moduleFilter) > 0 && !setContains(moduleFilter, moduleID) {
				continue
			}
			results = appendDocsFromStore(results, store, moduleID, "/api/apps/"+moduleID+"/docs/", query, docTypeFilter, topicFilter)
		}

		if launcherHelpStore != nil {
			moduleID := strings.TrimSpace(launcherHelpStore.ModuleID)
			if moduleID != "" && (len(moduleFilter) == 0 || setContains(moduleFilter, moduleID)) {
				results = appendDocsFromStore(results, launcherHelpStore, moduleID, "/api/os/help/", query, docTypeFilter, topicFilter)
			}
		}

		sort.Slice(results, func(i, j int) bool {
			if results[i].ModuleID != results[j].ModuleID {
				return results[i].ModuleID < results[j].ModuleID
			}
			return results[i].Slug < results[j].Slug
		})

		response := osDocsResponse{
			Total:   len(results),
			Results: results,
		}
		response.Facets.Topics = buildTopicFacets(results)
		response.Facets.DocTypes = buildDocTypeFacets(results)
		response.Facets.Modules = buildModuleFacets(results)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(response)
	})
}

func appendDocsFromStore(
	results []osDocResult,
	store *docmw.DocStore,
	moduleID string,
	urlPrefix string,
	query string,
	docTypeFilter map[string]struct{},
	topicFilter map[string]struct{},
) []osDocResult {
	if store == nil {
		return results
	}

	for _, doc := range store.TOC() {
		result := osDocResult{
			ModuleID: moduleID,
			Slug:     doc.Slug,
			Title:    doc.Title,
			DocType:  doc.DocType,
			Topics:   append([]string(nil), doc.Topics...),
			Summary:  doc.Summary,
			URL:      urlPrefix + doc.Slug,
		}
		if len(docTypeFilter) > 0 && !setContains(docTypeFilter, strings.ToLower(strings.TrimSpace(result.DocType))) {
			continue
		}
		if len(topicFilter) > 0 && !intersectsSet(topicFilter, result.Topics) {
			continue
		}
		if query != "" {
			haystack := strings.ToLower(result.Title + "\n" + result.Summary + "\n" + result.Slug + "\n" + result.ModuleID)
			if !strings.Contains(haystack, query) {
				continue
			}
		}
		results = append(results, result)
	}

	return results
}

func csvSet(raw string) map[string]struct{} {
	parts := strings.Split(strings.TrimSpace(raw), ",")
	out := map[string]struct{}{}
	for _, part := range parts {
		trimmed := strings.ToLower(strings.TrimSpace(part))
		if trimmed == "" {
			continue
		}
		out[trimmed] = struct{}{}
	}
	return out
}

func setContains(set map[string]struct{}, value string) bool {
	_, ok := set[strings.ToLower(strings.TrimSpace(value))]
	return ok
}

func intersectsSet(set map[string]struct{}, values []string) bool {
	for _, value := range values {
		if setContains(set, value) {
			return true
		}
	}
	return false
}

func buildTopicFacets(results []osDocResult) []osDocsFacet {
	counts := map[string]int{}
	for _, result := range results {
		for _, topic := range result.Topics {
			topic = strings.ToLower(strings.TrimSpace(topic))
			if topic == "" {
				continue
			}
			counts[topic]++
		}
	}
	facets := make([]osDocsFacet, 0, len(counts))
	for slug, count := range counts {
		facets = append(facets, osDocsFacet{Slug: slug, Count: count})
	}
	sort.Slice(facets, func(i, j int) bool { return facets[i].Slug < facets[j].Slug })
	return facets
}

func buildDocTypeFacets(results []osDocResult) []osDocsFacet {
	counts := map[string]int{}
	for _, result := range results {
		docType := strings.ToLower(strings.TrimSpace(result.DocType))
		if docType == "" {
			continue
		}
		counts[docType]++
	}
	facets := make([]osDocsFacet, 0, len(counts))
	for slug, count := range counts {
		facets = append(facets, osDocsFacet{Slug: slug, Count: count})
	}
	sort.Slice(facets, func(i, j int) bool { return facets[i].Slug < facets[j].Slug })
	return facets
}

func buildModuleFacets(results []osDocResult) []osDocsModuleFacet {
	counts := map[string]int{}
	for _, result := range results {
		moduleID := strings.ToLower(strings.TrimSpace(result.ModuleID))
		if moduleID == "" {
			continue
		}
		counts[moduleID]++
	}
	facets := make([]osDocsModuleFacet, 0, len(counts))
	for id, count := range counts {
		facets = append(facets, osDocsModuleFacet{ID: id, Count: count})
	}
	sort.Slice(facets, func(i, j int) bool { return facets[i].ID < facets[j].ID })
	return facets
}

func osWriteJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
