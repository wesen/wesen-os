package main

import (
	"context"
	"fmt"

	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
)

type appProfileSurfaceConfig struct {
	AppID              string
	VisibleRegistry    *gepprofiles.EngineProfileRegistry
	DefaultProfileSlug gepprofiles.EngineProfileSlug
	VisibleProfiles    []gepprofiles.EngineProfileSlug
	FallbackRegistry   gepprofiles.Registry
}

type appProfileSurface struct {
	appID              string
	base               gepprofiles.Registry
	visibleRegistry    gepprofiles.RegistrySlug
	defaultProfileSlug gepprofiles.EngineProfileSlug
	visibleProfiles    map[gepprofiles.EngineProfileSlug]struct{}
}

func newAppProfileSurface(ctx context.Context, cfg appProfileSurfaceConfig) (gepprofiles.Registry, gepprofiles.RegistrySlug, error) {
	if cfg.VisibleRegistry == nil {
		return nil, "", fmt.Errorf("%s app profile surface requires a visible registry", cfg.AppID)
	}
	if cfg.VisibleRegistry.Slug.IsZero() {
		return nil, "", fmt.Errorf("%s app profile surface visible registry slug is empty", cfg.AppID)
	}
	if cfg.DefaultProfileSlug.IsZero() {
		return nil, "", fmt.Errorf("%s app profile surface default profile slug is empty", cfg.AppID)
	}

	aggregateStore := gepprofiles.NewInMemoryEngineProfileStore()
	if cfg.FallbackRegistry != nil {
		if err := copyRegistriesIntoStore(ctx, aggregateStore, cfg.FallbackRegistry); err != nil {
			return nil, "", fmt.Errorf("copy fallback registries for %s: %w", cfg.AppID, err)
		}
	}

	visibleRegistry := cfg.VisibleRegistry.Clone()
	visibleRegistry.DefaultEngineProfileSlug = cfg.DefaultProfileSlug
	if err := aggregateStore.UpsertRegistry(ctx, visibleRegistry, gepprofiles.SaveOptions{
		Actor:  "wesen-os-launcher",
		Source: "app-profile-surface/" + cfg.AppID,
	}); err != nil {
		return nil, "", fmt.Errorf("upsert visible registry for %s: %w", cfg.AppID, err)
	}

	aggregateRegistry, err := gepprofiles.NewStoreRegistry(aggregateStore, visibleRegistry.Slug)
	if err != nil {
		return nil, "", fmt.Errorf("create aggregate registry for %s: %w", cfg.AppID, err)
	}

	surface := &appProfileSurface{
		appID:              cfg.AppID,
		base:               aggregateRegistry,
		visibleRegistry:    visibleRegistry.Slug,
		defaultProfileSlug: cfg.DefaultProfileSlug,
		visibleProfiles:    make(map[gepprofiles.EngineProfileSlug]struct{}, len(cfg.VisibleProfiles)),
	}
	for _, slug := range cfg.VisibleProfiles {
		if slug.IsZero() {
			continue
		}
		surface.visibleProfiles[slug] = struct{}{}
	}
	if len(surface.visibleProfiles) == 0 {
		surface.visibleProfiles[cfg.DefaultProfileSlug] = struct{}{}
	}
	if !surface.isVisibleProfile(cfg.DefaultProfileSlug) {
		return nil, "", fmt.Errorf("%s app default profile %q is not in the visible profile set", cfg.AppID, cfg.DefaultProfileSlug)
	}

	return surface, visibleRegistry.Slug, nil
}

func copyRegistriesIntoStore(ctx context.Context, store gepprofiles.EngineProfileStore, registry gepprofiles.Registry) error {
	if store == nil || registry == nil {
		return nil
	}
	registries, err := registry.ListRegistries(ctx)
	if err != nil {
		return err
	}
	for _, summary := range registries {
		reg, err := registry.GetRegistry(ctx, summary.Slug)
		if err != nil {
			return err
		}
		if err := store.UpsertRegistry(ctx, reg, gepprofiles.SaveOptions{
			Actor:  "wesen-os-launcher",
			Source: "launcher-profile-bootstrap",
		}); err != nil {
			return err
		}
	}
	return nil
}

func (r *appProfileSurface) ListRegistries(ctx context.Context) ([]gepprofiles.RegistrySummary, error) {
	registry, err := r.GetRegistry(ctx, r.visibleRegistry)
	if err != nil {
		return nil, err
	}
	return []gepprofiles.RegistrySummary{{
		Slug:                     registry.Slug,
		DisplayName:              registry.DisplayName,
		DefaultEngineProfileSlug: registry.DefaultEngineProfileSlug,
		EngineProfileCount:       len(registry.Profiles),
	}}, nil
}

func (r *appProfileSurface) GetRegistry(ctx context.Context, registrySlug gepprofiles.RegistrySlug) (*gepprofiles.EngineProfileRegistry, error) {
	resolvedRegistry := r.resolveVisibleRegistry(registrySlug)
	if resolvedRegistry != r.visibleRegistry {
		return nil, gepprofiles.ErrRegistryNotFound
	}
	registry, err := r.base.GetRegistry(ctx, r.visibleRegistry)
	if err != nil {
		return nil, err
	}
	filtered := registry.Clone()
	filtered.DefaultEngineProfileSlug = r.defaultProfileSlug
	filtered.Profiles = filterProfileMap(filtered.Profiles, r.visibleProfiles)
	return filtered, nil
}

func (r *appProfileSurface) ListEngineProfiles(ctx context.Context, registrySlug gepprofiles.RegistrySlug) ([]*gepprofiles.EngineProfile, error) {
	registry, err := r.GetRegistry(ctx, registrySlug)
	if err != nil {
		return nil, err
	}
	ret := make([]*gepprofiles.EngineProfile, 0, len(registry.Profiles))
	for _, profile := range registry.Profiles {
		if profile == nil {
			continue
		}
		ret = append(ret, profile.Clone())
	}
	return ret, nil
}

func (r *appProfileSurface) GetEngineProfile(ctx context.Context, registrySlug gepprofiles.RegistrySlug, profileSlug gepprofiles.EngineProfileSlug) (*gepprofiles.EngineProfile, error) {
	resolvedRegistry := r.resolveVisibleRegistry(registrySlug)
	if resolvedRegistry != r.visibleRegistry {
		return nil, gepprofiles.ErrRegistryNotFound
	}
	if !r.isVisibleProfile(profileSlug) {
		return nil, gepprofiles.ErrProfileNotFound
	}
	return r.base.GetEngineProfile(ctx, r.visibleRegistry, profileSlug)
}

func (r *appProfileSurface) ResolveEngineProfile(ctx context.Context, in gepprofiles.ResolveInput) (*gepprofiles.ResolvedEngineProfile, error) {
	resolvedRegistry := r.resolveVisibleRegistry(in.RegistrySlug)
	if resolvedRegistry != r.visibleRegistry {
		return nil, gepprofiles.ErrRegistryNotFound
	}
	resolvedProfile := in.EngineProfileSlug
	if resolvedProfile.IsZero() {
		resolvedProfile = r.defaultProfileSlug
	}
	if !r.isVisibleProfile(resolvedProfile) {
		return nil, gepprofiles.ErrProfileNotFound
	}
	return r.base.ResolveEngineProfile(ctx, gepprofiles.ResolveInput{
		RegistrySlug:      r.visibleRegistry,
		EngineProfileSlug: resolvedProfile,
	})
}

func (r *appProfileSurface) resolveVisibleRegistry(registrySlug gepprofiles.RegistrySlug) gepprofiles.RegistrySlug {
	if registrySlug.IsZero() {
		return r.visibleRegistry
	}
	return registrySlug
}

func (r *appProfileSurface) isVisibleProfile(profileSlug gepprofiles.EngineProfileSlug) bool {
	_, ok := r.visibleProfiles[profileSlug]
	return ok
}

func filterProfileMap(
	profiles map[gepprofiles.EngineProfileSlug]*gepprofiles.EngineProfile,
	visible map[gepprofiles.EngineProfileSlug]struct{},
) map[gepprofiles.EngineProfileSlug]*gepprofiles.EngineProfile {
	filtered := make(map[gepprofiles.EngineProfileSlug]*gepprofiles.EngineProfile, len(visible))
	for slug, profile := range profiles {
		if profile == nil {
			continue
		}
		if _, ok := visible[slug]; !ok {
			continue
		}
		filtered[slug] = profile.Clone()
	}
	return filtered
}
