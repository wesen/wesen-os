package main

import (
	"context"
	"fmt"
	"io"

	aisettings "github.com/go-go-golems/geppetto/pkg/steps/ai/settings"
	"github.com/go-go-golems/wesen-os/pkg/chathost"
	"github.com/pkg/errors"
	"gopkg.in/yaml.v3"
)

// printInferenceSettings resolves the effective inference settings of each chat
// host and prints them as YAML with API keys redacted. It is the launcher's
// answer to "why does app X have no API key" — it shows exactly which engine,
// api type, and credentials each app's default profile resolves to after the
// launcher base settings and app profile stack are merged.
func printInferenceSettings(ctx context.Context, w io.Writer, hosts ...*chathost.Host) error {
	for _, host := range hosts {
		if host == nil {
			continue
		}
		settings, err := host.EffectiveSettings(ctx)
		if err != nil {
			return errors.Wrapf(err, "resolve effective settings for %q", host.AppID())
		}
		out, err := yaml.Marshal(redactInferenceSettings(settings))
		if err != nil {
			return errors.Wrapf(err, "marshal effective settings for %q", host.AppID())
		}
		fmt.Fprintf(w, "# app: %s\n%s\n", host.AppID(), string(out))
	}
	return nil
}

// redactInferenceSettings returns a summary view of the load-bearing inference
// fields with secrets masked. It intentionally reports only the fields an
// operator needs to diagnose engine/credential resolution rather than the full
// settings struct.
func redactInferenceSettings(s *aisettings.InferenceSettings) map[string]any {
	view := map[string]any{}
	if s == nil {
		return view
	}
	chat := map[string]any{}
	if s.Chat != nil {
		if s.Chat.ApiType != nil {
			chat["api_type"] = string(*s.Chat.ApiType)
		}
		if s.Chat.Engine != nil {
			chat["engine"] = *s.Chat.Engine
		}
		if s.Chat.MaxResponseTokens != nil {
			chat["max_response_tokens"] = *s.Chat.MaxResponseTokens
		}
		if s.Chat.Temperature != nil {
			chat["temperature"] = *s.Chat.Temperature
		}
	}
	if len(chat) > 0 {
		view["chat"] = chat
	}
	if s.API != nil {
		keys := map[string]any{}
		for name, value := range s.API.APIKeys {
			keys[name] = maskSecret(value)
		}
		if len(keys) > 0 {
			view["api_keys"] = keys
		}
		if len(s.API.BaseUrls) > 0 {
			view["base_urls"] = s.API.BaseUrls
		}
	}
	return view
}

func maskSecret(value string) string {
	if value == "" {
		return "(unset)"
	}
	if len(value) <= 8 {
		return "(set)"
	}
	return value[:4] + "…" + value[len(value)-4:]
}
