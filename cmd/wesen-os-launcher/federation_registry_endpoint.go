package main

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
)

func registerOSFederationRegistryEndpoint(mux *http.ServeMux, configPath string) {
	if mux == nil {
		return
	}

	mux.HandleFunc("/api/os/federation-registry", func(w http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		path := strings.TrimSpace(configPath)
		if path == "" {
			http.NotFound(w, req)
			return
		}

		data, err := os.ReadFile(path)
		if err != nil {
			if os.IsNotExist(err) {
				http.NotFound(w, req)
				return
			}
			http.Error(w, "failed to read federation registry", http.StatusInternalServerError)
			return
		}

		trimmed := strings.TrimSpace(string(data))
		if trimmed == "" || !json.Valid(data) {
			http.Error(w, "invalid federation registry json", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(trimmed))
	})
}
