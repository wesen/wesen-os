package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"

	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
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

func registerOSDocsEndpoint(mux *http.ServeMux, registry *backendhost.ModuleRegistry) {
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

		results := make([]osDocResult, 0, 32)
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

			for _, doc := range store.TOC() {
				result := osDocResult{
					ModuleID: moduleID,
					Slug:     doc.Slug,
					Title:    doc.Title,
					DocType:  doc.DocType,
					Topics:   append([]string(nil), doc.Topics...),
					Summary:  doc.Summary,
					URL:      "/api/apps/" + moduleID + "/docs/" + doc.Slug,
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
