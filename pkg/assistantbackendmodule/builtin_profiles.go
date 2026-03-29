package assistantbackendmodule

import (
	"embed"
	"fmt"

	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
)

var (
	assistantBuiltinRegistrySlug = gepprofiles.MustRegistrySlug("assistant")
	assistantDefaultProfileSlug  = gepprofiles.MustEngineProfileSlug("assistant")
	assistantVisibleProfileSlugs = []gepprofiles.EngineProfileSlug{
		gepprofiles.MustEngineProfileSlug("assistant"),
	}
)

//go:embed profiles/profiles.yaml
var assistantBuiltinProfilesFS embed.FS

func BuiltinProfileRegistrySlug() gepprofiles.RegistrySlug {
	return assistantBuiltinRegistrySlug
}

func DefaultProfileSlug() gepprofiles.EngineProfileSlug {
	return assistantDefaultProfileSlug
}

func VisibleProfileSlugs() []gepprofiles.EngineProfileSlug {
	return append([]gepprofiles.EngineProfileSlug(nil), assistantVisibleProfileSlugs...)
}

func LoadBuiltinProfileRegistry() (*gepprofiles.EngineProfileRegistry, error) {
	data, err := assistantBuiltinProfilesFS.ReadFile("profiles/profiles.yaml")
	if err != nil {
		return nil, fmt.Errorf("read assistant builtin profiles: %w", err)
	}
	registry, err := gepprofiles.DecodeEngineProfileYAMLSingleRegistry(data)
	if err != nil {
		return nil, fmt.Errorf("decode assistant builtin profiles: %w", err)
	}
	if registry == nil {
		return nil, fmt.Errorf("decode assistant builtin profiles: registry is nil")
	}
	registry.DefaultEngineProfileSlug = assistantDefaultProfileSlug
	return registry, nil
}
