package main

import (
	"context"
	"embed"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	clay "github.com/go-go-golems/clay/pkg"
	gepprofiles "github.com/go-go-golems/geppetto/pkg/profiles"
	geppettosections "github.com/go-go-golems/geppetto/pkg/sections"
	"github.com/go-go-golems/glazed/pkg/cli"
	"github.com/go-go-golems/glazed/pkg/cmds"
	"github.com/go-go-golems/glazed/pkg/cmds/fields"
	"github.com/go-go-golems/glazed/pkg/cmds/logging"
	"github.com/go-go-golems/glazed/pkg/cmds/values"
	"github.com/go-go-golems/glazed/pkg/help"
	help_cmd "github.com/go-go-golems/glazed/pkg/help/cmd"
	webchat "github.com/go-go-golems/pinocchio/pkg/webchat"
	webhttp "github.com/go-go-golems/pinocchio/pkg/webchat/http"
	"github.com/pkg/errors"

	wesendoc "github.com/go-go-golems/wesen-os/pkg/doc"
	"github.com/spf13/cobra"

	"github.com/go-go-golems/go-go-app-inventory/pkg/inventorydb"
	"github.com/go-go-golems/go-go-app-inventory/pkg/inventorytools"
	"github.com/go-go-golems/go-go-app-inventory/pkg/pinoweb"
	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
	arcagibackend "github.com/go-go-golems/wesen-os/pkg/arcagi"
	gepabackend "github.com/go-go-golems/wesen-os/pkg/gepa"
	"github.com/go-go-golems/wesen-os/pkg/launcherui"
)

//go:embed static
var inventoryStaticFS embed.FS

type Command struct {
	*cmds.CommandDescription
}

type serverSettings struct {
	Root                 string `glazed:"root"`
	RequiredApps         string `glazed:"required-apps"`
	LegacyAliases        string `glazed:"legacy-aliases"`
	GEPAScriptsRoot      string `glazed:"gepa-scripts-root"`
	GEPARunTimeout       int    `glazed:"gepa-run-timeout-seconds"`
	GEPAMaxConcurrent    int    `glazed:"gepa-max-concurrent-runs"`
	InventoryDB          string `glazed:"inventory-db"`
	InventorySeedOnStart bool   `glazed:"inventory-seed-on-start"`
	InventoryResetOnBoot bool   `glazed:"inventory-reset-on-start"`
	ARCEnabled           bool   `glazed:"arc-enabled"`
	ARCDriver            string `glazed:"arc-driver"`
	ARCRuntimeMode       string `glazed:"arc-runtime-mode"`
	ARCRepoRoot          string `glazed:"arc-repo-root"`
	ARCStartupTimeout    int    `glazed:"arc-startup-timeout-seconds"`
	ARCRequestTimeout    int    `glazed:"arc-request-timeout-seconds"`
	ARCRawListenAddr     string `glazed:"arc-raw-listen-addr"`
	ARCAPIKey            string `glazed:"arc-api-key"`
	ARCMaxSessionEvents  int    `glazed:"arc-max-session-events"`
}

const (
	profileRegistrySlug = "default"
)

func NewCommand() (*Command, error) {
	geLayers, err := geppettosections.CreateGeppettoSections()
	if err != nil {
		return nil, errors.Wrap(err, "create geppetto sections")
	}

	desc := cmds.NewCommandDescription(
		"wesen-os-launcher",
		cmds.WithShort("Serve the wesen-os launcher shell with namespaced backend app modules"),
		cmds.WithFlags(
			fields.New("addr", fields.TypeString, fields.WithDefault(":8091"), fields.WithHelp("HTTP listen address")),
			fields.New("root", fields.TypeString, fields.WithDefault("/"), fields.WithHelp("Serve handlers under a URL root (for example /api/apps/inventory)")),
			fields.New("required-apps", fields.TypeString, fields.WithDefault("inventory"), fields.WithHelp("Comma-separated backend app IDs required at startup")),
			fields.New("legacy-aliases", fields.TypeString, fields.WithDefault(""), fields.WithHelp("Comma-separated legacy route aliases (startup fails if forbidden aliases are configured)")),
			fields.New("gepa-scripts-root", fields.TypeString, fields.WithDefault(""), fields.WithHelp("Comma-separated directories to scan for GEPA scripts (.js/.mjs/.cjs)")),
			fields.New("gepa-run-timeout-seconds", fields.TypeInteger, fields.WithDefault(30), fields.WithHelp("Timeout in seconds for one GEPA run")),
			fields.New("gepa-max-concurrent-runs", fields.TypeInteger, fields.WithDefault(4), fields.WithHelp("Max number of GEPA runs in running state")),
			fields.New("idle-timeout-seconds", fields.TypeInteger, fields.WithDefault(60), fields.WithHelp("Stop per-conversation reader after N seconds with no sockets (0=disabled)")),
			fields.New("evict-idle-seconds", fields.TypeInteger, fields.WithDefault(300), fields.WithHelp("Evict conversations after N seconds idle (0=disabled)")),
			fields.New("evict-interval-seconds", fields.TypeInteger, fields.WithDefault(60), fields.WithHelp("Sweep idle conversations every N seconds (0=disabled)")),
			fields.New("timeline-dsn", fields.TypeString, fields.WithDefault(""), fields.WithHelp("SQLite DSN for durable timeline snapshots (preferred over timeline-db)")),
			fields.New("timeline-db", fields.TypeString, fields.WithDefault(""), fields.WithHelp("SQLite DB file path for durable timeline snapshots")),
			fields.New("turns-dsn", fields.TypeString, fields.WithDefault(""), fields.WithHelp("SQLite DSN for durable turn snapshots (preferred over turns-db)")),
			fields.New("turns-db", fields.TypeString, fields.WithDefault(""), fields.WithHelp("SQLite DB file path for durable turn snapshots")),
			fields.New("timeline-inmem-max-entities", fields.TypeInteger, fields.WithDefault(1000), fields.WithHelp("In-memory timeline entity cap when no timeline DB is configured")),
			fields.New("inventory-db", fields.TypeString, fields.WithDefault("./data/inventory.db"), fields.WithHelp("SQLite DB file path for inventory domain data")),
			fields.New("inventory-seed-on-start", fields.TypeBool, fields.WithDefault(true), fields.WithHelp("Seed inventory domain data during startup")),
			fields.New("inventory-reset-on-start", fields.TypeBool, fields.WithDefault(false), fields.WithHelp("Reset inventory domain tables before seeding")),
			fields.New("arc-enabled", fields.TypeBool, fields.WithDefault(true), fields.WithHelp("Enable ARC-AGI backend module registration")),
			fields.New("arc-driver", fields.TypeString, fields.WithDefault("dagger"), fields.WithHelp("ARC runtime driver (dagger or raw)")),
			fields.New("arc-runtime-mode", fields.TypeString, fields.WithDefault("offline"), fields.WithHelp("ARC operation mode (offline, normal, online)")),
			fields.New("arc-repo-root", fields.TypeString, fields.WithDefault("../go-go-app-arc-agi-3/2026-02-27--arc-agi/ARC-AGI"), fields.WithHelp("Filesystem path to ARC-AGI Python project root")),
			fields.New("arc-startup-timeout-seconds", fields.TypeInteger, fields.WithDefault(45), fields.WithHelp("ARC runtime startup health timeout in seconds")),
			fields.New("arc-request-timeout-seconds", fields.TypeInteger, fields.WithDefault(30), fields.WithHelp("ARC upstream request timeout in seconds")),
			fields.New("arc-raw-listen-addr", fields.TypeString, fields.WithDefault("127.0.0.1:18081"), fields.WithHelp("Loopback listen address for raw ARC runtime mode")),
			fields.New("arc-api-key", fields.TypeString, fields.WithDefault("1234"), fields.WithHelp("X-API-Key header used for ARC requests")),
			fields.New("arc-max-session-events", fields.TypeInteger, fields.WithDefault(200), fields.WithHelp("Maximum ARC session events retained per session")),
		),
		cmds.WithSections(geLayers...),
	)

	return &Command{CommandDescription: desc}, nil
}

func (c *Command) RunIntoWriter(ctx context.Context, parsed *values.Values, _ io.Writer) error {
	cfg := &serverSettings{}
	_ = parsed.DecodeSectionInto(values.DefaultSlug, cfg)

	inventoryDBPath := strings.TrimSpace(cfg.InventoryDB)
	if inventoryDBPath == "" {
		inventoryDBPath = "./data/inventory.db"
	}
	sqliteDB, err := inventorydb.Open(inventoryDBPath)
	if err != nil {
		return errors.Wrap(err, "open inventory sqlite db")
	}
	defer func() { _ = sqliteDB.Close() }()

	if err := inventorydb.Migrate(sqliteDB); err != nil {
		return errors.Wrap(err, "migrate inventory sqlite db")
	}
	if cfg.InventoryResetOnBoot {
		if err := inventorydb.ResetAndSeed(sqliteDB); err != nil {
			return errors.Wrap(err, "reset and seed inventory sqlite db")
		}
	} else if cfg.InventorySeedOnStart {
		if err := inventorydb.Seed(sqliteDB); err != nil {
			return errors.Wrap(err, "seed inventory sqlite db")
		}
	}

	inventoryStore, err := inventorydb.NewStore(sqliteDB)
	if err != nil {
		return errors.Wrap(err, "create inventory store")
	}

	composer := pinoweb.NewRuntimeComposer(parsed, pinoweb.RuntimeComposerOptions{
		RuntimeKey:   "inventory",
		SystemPrompt: "You are an inventory assistant. Be concise, accurate, and tool-first.",
		AllowedTools: append([]string(nil), inventorytools.InventoryToolNames...),
	})
	pinoweb.RegisterInventoryHypercardExtensions()
	profileRegistry, err := newInMemoryProfileService(
		"default",
		&gepprofiles.Profile{
			Slug:        gepprofiles.MustProfileSlug("default"),
			DisplayName: "Default",
			Description: "Baseline assistant profile with no app-specific middleware configuration.",
			Runtime: gepprofiles.RuntimeSpec{
				SystemPrompt: "You are a helpful inventory assistant.",
				Middlewares:  []gepprofiles.MiddlewareUse{},
			},
		},
		&gepprofiles.Profile{
			Slug:        gepprofiles.MustProfileSlug("inventory"),
			DisplayName: "Inventory",
			Description: "Tool-first inventory assistant profile.",
			Runtime: gepprofiles.RuntimeSpec{
				SystemPrompt: "You are an inventory assistant. Be concise, accurate, and tool-first.",
				Middlewares:  inventoryRuntimeMiddlewares(),
				Tools:        append([]string(nil), inventorytools.InventoryToolNames...),
			},
		},
		&gepprofiles.Profile{
			Slug:        gepprofiles.MustProfileSlug("analyst"),
			DisplayName: "Analyst",
			Description: "Analysis-oriented profile for inventory reporting tasks.",
			Runtime: gepprofiles.RuntimeSpec{
				SystemPrompt: "You are an inventory analyst. Explain results with concise evidence.",
				Middlewares:  inventoryRuntimeMiddlewares(),
				Tools:        append([]string(nil), inventorytools.InventoryToolNames...),
			},
		},
		&gepprofiles.Profile{
			Slug:        gepprofiles.MustProfileSlug("planner"),
			DisplayName: "Planner",
			Description: "Planning-focused profile for restock and operations scenarios.",
			Runtime: gepprofiles.RuntimeSpec{
				SystemPrompt: "You are an inventory operations planner. Prioritize actionable next steps.",
				Middlewares:  inventoryRuntimeMiddlewares(),
				Tools:        append([]string(nil), inventorytools.InventoryToolNames...),
			},
		},
	)
	if err != nil {
		return errors.Wrap(err, "initialize profile registry")
	}
	requestResolver := pinoweb.NewStrictRequestResolver("inventory").WithProfileRegistry(
		profileRegistry,
		gepprofiles.MustRegistrySlug(profileRegistrySlug),
	)

	srv, err := webchat.NewServer(
		ctx,
		parsed,
		inventoryStaticFS,
		webchat.WithRuntimeComposer(composer),
		webchat.WithEventSinkWrapper(pinoweb.NewInventoryEventSinkWrapper(ctx)),
		webchat.WithDebugRoutesEnabled(os.Getenv("PINOCCHIO_WEBCHAT_DEBUG") == "1"),
	)
	if err != nil {
		return errors.Wrap(err, "new webchat server")
	}
	for name, factory := range inventorytools.InventoryToolFactories(inventoryStore) {
		srv.RegisterTool(name, factory)
	}

	gepaModule, err := gepabackend.NewModule(gepabackend.ModuleConfig{
		ScriptsRoots:       parseCSV(cfg.GEPAScriptsRoot),
		EnableReflection:   true,
		RunCompletionDelay: 300 * time.Millisecond,
		RunTimeout:         time.Duration(cfg.GEPARunTimeout) * time.Second,
		MaxConcurrentRuns:  cfg.GEPAMaxConcurrent,
	})
	if err != nil {
		return errors.Wrap(err, "create gepa backend module")
	}

	modules := []backendhost.AppBackendModule{
		newInventoryBackendModule(
			srv,
			requestResolver,
			profileRegistry,
			composer.MiddlewareDefinitions(),
			inventoryExtensionSchemas(),
		),
		gepaModule,
	}
	if cfg.ARCEnabled {
		arcModule, err := arcagibackend.NewModule(arcagibackend.ModuleConfig{
			EnableReflection: true,
			Driver:           strings.TrimSpace(cfg.ARCDriver),
			RuntimeMode:      strings.TrimSpace(cfg.ARCRuntimeMode),
			ArcRepoRoot:      strings.TrimSpace(cfg.ARCRepoRoot),
			StartupTimeout:   time.Duration(cfg.ARCStartupTimeout) * time.Second,
			RequestTimeout:   time.Duration(cfg.ARCRequestTimeout) * time.Second,
			RawListenAddr:    strings.TrimSpace(cfg.ARCRawListenAddr),
			APIKey:           strings.TrimSpace(cfg.ARCAPIKey),
			MaxSessionEvents: cfg.ARCMaxSessionEvents,
		})
		if err != nil {
			return errors.Wrap(err, "create arc backend module")
		}
		modules = append(modules, arcModule)
	}

	moduleRegistry, err := backendhost.NewModuleRegistry(modules...)
	if err != nil {
		return errors.Wrap(err, "create backend module registry")
	}
	if err := backendhost.GuardNoLegacyAliases(parseCSV(cfg.LegacyAliases)); err != nil {
		return errors.Wrap(err, "validate legacy route aliases")
	}
	lifecycle := backendhost.NewLifecycleManager(moduleRegistry)
	if err := lifecycle.Startup(ctx, backendhost.StartupOptions{
		RequiredAppIDs: parseCSV(cfg.RequiredApps),
	}); err != nil {
		return errors.Wrap(err, "start backend module lifecycle")
	}
	defer func() { _ = lifecycle.Stop(context.Background()) }()

	appMux := http.NewServeMux()
	backendhost.RegisterAppsManifestEndpoint(appMux, moduleRegistry)
	for _, module := range moduleRegistry.Modules() {
		manifest := module.Manifest()
		if err := backendhost.MountNamespacedRoutes(appMux, manifest.AppID, module.MountRoutes); err != nil {
			return errors.Wrapf(err, "mount namespaced routes for %q", manifest.AppID)
		}
	}
	registerLegacyAliasNotFoundHandlers(appMux)
	appMux.Handle("/", launcherui.Handler())

	httpSrv := srv.HTTPServer()
	if httpSrv == nil {
		return errors.New("http server is not initialized")
	}

	if cfg.Root != "" && cfg.Root != "/" {
		parent := http.NewServeMux()
		prefix := cfg.Root
		if !strings.HasPrefix(prefix, "/") {
			prefix = "/" + prefix
		}
		if !strings.HasSuffix(prefix, "/") {
			prefix += "/"
		}
		parent.Handle(prefix, http.StripPrefix(strings.TrimRight(prefix, "/"), appMux))
		httpSrv.Handler = parent
	} else {
		httpSrv.Handler = appMux
	}

	return srv.Run(ctx)
}

func newInMemoryProfileService(defaultSlug string, profileDefs ...*gepprofiles.Profile) (gepprofiles.Registry, error) {
	registrySlug := gepprofiles.MustRegistrySlug(profileRegistrySlug)
	registry := &gepprofiles.ProfileRegistry{
		Slug:     registrySlug,
		Profiles: map[gepprofiles.ProfileSlug]*gepprofiles.Profile{},
	}

	for _, profile := range profileDefs {
		if profile == nil {
			continue
		}
		clone := profile.Clone()
		if clone == nil {
			continue
		}
		if err := gepprofiles.ValidateProfile(clone); err != nil {
			return nil, err
		}
		registry.Profiles[clone.Slug] = clone
	}

	if strings.TrimSpace(defaultSlug) != "" {
		slug, err := gepprofiles.ParseProfileSlug(defaultSlug)
		if err != nil {
			return nil, err
		}
		registry.DefaultProfileSlug = slug
	}

	if len(registry.Profiles) > 0 {
		if registry.DefaultProfileSlug.IsZero() {
			registry.DefaultProfileSlug = firstProfileSlug(registry.Profiles)
		}
		if _, ok := registry.Profiles[registry.DefaultProfileSlug]; !ok {
			registry.DefaultProfileSlug = firstProfileSlug(registry.Profiles)
		}
	}

	if err := gepprofiles.ValidateRegistry(registry); err != nil {
		return nil, err
	}
	store := gepprofiles.NewInMemoryProfileStore()
	if err := store.UpsertRegistry(context.Background(), registry, gepprofiles.SaveOptions{
		Actor:  "wesen-os-launcher",
		Source: "builtin",
	}); err != nil {
		return nil, err
	}
	return gepprofiles.NewStoreRegistry(store, registrySlug)
}

func firstProfileSlug(profiles map[gepprofiles.ProfileSlug]*gepprofiles.Profile) gepprofiles.ProfileSlug {
	slugs := make([]gepprofiles.ProfileSlug, 0, len(profiles))
	for slug := range profiles {
		slugs = append(slugs, slug)
	}
	sort.Slice(slugs, func(i, j int) bool { return slugs[i] < slugs[j] })
	if len(slugs) == 0 {
		return ""
	}
	return slugs[0]
}

func inventoryRuntimeMiddlewares() []gepprofiles.MiddlewareUse {
	return []gepprofiles.MiddlewareUse{
		{Name: "inventory_artifact_policy", ID: "artifact-policy"},
		{Name: "inventory_suggestions_policy", ID: "suggestions-policy"},
	}
}

func parseCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		out = append(out, trimmed)
	}
	return out
}

func inventoryExtensionSchemas() []webhttp.ExtensionSchemaDocument {
	return []webhttp.ExtensionSchemaDocument{
		{
			Key: "inventory.starter_suggestions@v1",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"items": map[string]any{
						"type": "array",
						"items": map[string]any{
							"type": "string",
						},
						"default": []any{},
					},
				},
				"required":             []any{"items"},
				"additionalProperties": false,
			},
		},
	}
}

func registerLegacyAliasNotFoundHandlers(mux *http.ServeMux) {
	if mux == nil {
		return
	}
	notFound := func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	}
	mux.HandleFunc("/chat", notFound)
	mux.HandleFunc("/chat/", notFound)
	mux.HandleFunc("/ws", notFound)
	mux.HandleFunc("/ws/", notFound)
	mux.HandleFunc("/api/timeline", notFound)
	mux.HandleFunc("/api/timeline/", notFound)
}

func main() {
	root := &cobra.Command{
		Use: "wesen-os-launcher",
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			return logging.InitLoggerFromCobra(cmd)
		},
	}

	helpSystem := help.NewHelpSystem()
	if err := wesendoc.AddDocToHelpSystem(helpSystem); err != nil {
		cobra.CheckErr(err)
	}
	help_cmd.SetupCobraRootCommand(helpSystem, root)

	if err := clay.InitGlazed("wesen-os", root); err != nil {
		cobra.CheckErr(err)
	}

	c, err := NewCommand()
	cobra.CheckErr(err)
	command, err := cli.BuildCobraCommand(c, cli.WithCobraMiddlewaresFunc(geppettosections.GetCobraCommandGeppettoMiddlewares))
	cobra.CheckErr(err)
	root.AddCommand(command)
	cobra.CheckErr(root.Execute())
}
