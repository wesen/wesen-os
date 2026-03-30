package main

import (
	"context"
	"embed"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	clay "github.com/go-go-golems/clay/pkg"
	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
	"github.com/go-go-golems/geppetto/pkg/inference/middlewarecfg"
	geppettosections "github.com/go-go-golems/geppetto/pkg/sections"
	"github.com/go-go-golems/glazed/pkg/cli"
	"github.com/go-go-golems/glazed/pkg/cmds"
	"github.com/go-go-golems/glazed/pkg/cmds/fields"
	"github.com/go-go-golems/glazed/pkg/cmds/logging"
	"github.com/go-go-golems/glazed/pkg/cmds/values"
	"github.com/go-go-golems/glazed/pkg/help"
	help_cmd "github.com/go-go-golems/glazed/pkg/help/cmd"
	profilechat "github.com/go-go-golems/go-go-os-chat/pkg/profilechat"
	webchat "github.com/go-go-golems/pinocchio/pkg/webchat"
	"github.com/pkg/errors"

	wesendoc "github.com/go-go-golems/wesen-os/pkg/doc"
	"github.com/spf13/cobra"

	inventorybackendmodule "github.com/go-go-golems/go-go-app-inventory/pkg/backendmodule"
	"github.com/go-go-golems/go-go-app-inventory/pkg/inventorydb"
	"github.com/go-go-golems/go-go-app-inventory/pkg/inventorytools"
	"github.com/go-go-golems/go-go-app-inventory/pkg/pinoweb"
	"github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
	arcagibackend "github.com/go-go-golems/wesen-os/pkg/arcagi"
	assistantbackendmodule "github.com/go-go-golems/wesen-os/pkg/assistantbackendmodule"
	gepabackend "github.com/go-go-golems/wesen-os/pkg/gepa"
	"github.com/go-go-golems/wesen-os/pkg/launcherui"
	sqlitebackend "github.com/go-go-golems/wesen-os/pkg/sqlite"
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
	SQLiteDB             string `glazed:"sqlite-db"`
	SQLiteReadOnly       bool   `glazed:"sqlite-db-read-only"`
	SQLiteAutoCreate     bool   `glazed:"sqlite-db-auto-create"`
	SQLiteRowLimit       int    `glazed:"sqlite-default-row-limit"`
	SQLiteTimeoutSeconds int    `glazed:"sqlite-statement-timeout-seconds"`
	SQLiteBusyTimeoutMS  int    `glazed:"sqlite-busy-timeout-ms"`
	SQLiteMultiStatement bool   `glazed:"sqlite-enable-multi-statement"`
	SQLiteAllowlist      string `glazed:"sqlite-statement-allowlist"`
	SQLiteDenylist       string `glazed:"sqlite-statement-denylist"`
	SQLiteRedactColumns  string `glazed:"sqlite-redact-columns"`
	SQLiteRateLimit      int    `glazed:"sqlite-rate-limit-requests"`
	SQLiteRateWindowSec  int    `glazed:"sqlite-rate-limit-window-seconds"`
	SQLiteMaxPayload     int    `glazed:"sqlite-max-payload-bytes"`
	SQLiteAuditEvents    bool   `glazed:"sqlite-audit-log-events"`
	ARCEnabled           bool   `glazed:"arc-enabled"`
	ARCDriver            string `glazed:"arc-driver"`
	ARCRuntimeMode       string `glazed:"arc-runtime-mode"`
	ARCRepoRoot          string `glazed:"arc-repo-root"`
	ARCStartupTimeout    int    `glazed:"arc-startup-timeout-seconds"`
	ARCRequestTimeout    int    `glazed:"arc-request-timeout-seconds"`
	ARCRawListenAddr     string `glazed:"arc-raw-listen-addr"`
	ARCAPIKey            string `glazed:"arc-api-key"`
	ARCMaxSessionEvents  int    `glazed:"arc-max-session-events"`
	FederationRegistry   string `glazed:"federation-registry"`
}

func NewCommand() (*Command, error) {
	geLayers, err := geppettosections.CreateGeppettoSections()
	if err != nil {
		return nil, errors.Wrap(err, "create geppetto sections")
	}
	sqliteDefaults := sqlitebackend.DefaultModuleConfig()
	sqliteRuntimeDefaults := sqliteDefaults.RuntimeConfig

	desc := cmds.NewCommandDescription(
		"wesen-os-launcher",
		cmds.WithShort("Serve the wesen-os launcher shell with namespaced backend app modules"),
		cmds.WithFlags(
			fields.New("addr", fields.TypeString, fields.WithDefault(":8091"), fields.WithHelp("HTTP listen address")),
			fields.New("root", fields.TypeString, fields.WithDefault("/"), fields.WithHelp("Serve handlers under a URL root (for example /api/apps/inventory)")),
			fields.New("required-apps", fields.TypeString, fields.WithDefault("inventory,sqlite"), fields.WithHelp("Comma-separated backend app IDs required at startup")),
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
			fields.New("sqlite-db", fields.TypeString, fields.WithDefault(sqliteRuntimeDefaults.DBPath), fields.WithHelp("SQLite DB file path for sqlite app backend module")),
			fields.New("sqlite-db-read-only", fields.TypeBool, fields.WithDefault(sqliteRuntimeDefaults.ReadOnly), fields.WithHelp("Open sqlite app DB in read-only mode")),
			fields.New("sqlite-db-auto-create", fields.TypeBool, fields.WithDefault(sqliteRuntimeDefaults.AutoCreate), fields.WithHelp("Create sqlite app DB file if missing")),
			fields.New("sqlite-default-row-limit", fields.TypeInteger, fields.WithDefault(sqliteRuntimeDefaults.DefaultRowLimit), fields.WithHelp("Default max row count returned per sqlite query")),
			fields.New("sqlite-statement-timeout-seconds", fields.TypeInteger, fields.WithDefault(int(sqliteRuntimeDefaults.StatementTimeout/time.Second)), fields.WithHelp("Default sqlite statement timeout in seconds")),
			fields.New("sqlite-busy-timeout-ms", fields.TypeInteger, fields.WithDefault(sqliteRuntimeDefaults.OpenBusyTimeoutMS), fields.WithHelp("SQLite busy timeout in milliseconds for sqlite app module")),
			fields.New("sqlite-enable-multi-statement", fields.TypeBool, fields.WithDefault(sqliteRuntimeDefaults.EnableMultiStatement), fields.WithHelp("Allow multi-statement sqlite payloads when request opts in")),
			fields.New("sqlite-statement-allowlist", fields.TypeString, fields.WithDefault(strings.Join(sqliteRuntimeDefaults.StatementAllowlist, ",")), fields.WithHelp("Comma-separated sqlite statement types to allow (empty allows all)")),
			fields.New("sqlite-statement-denylist", fields.TypeString, fields.WithDefault(strings.Join(sqliteRuntimeDefaults.StatementDenylist, ",")), fields.WithHelp("Comma-separated sqlite statement types to deny")),
			fields.New("sqlite-redact-columns", fields.TypeString, fields.WithDefault(strings.Join(sqliteRuntimeDefaults.RedactedColumns, ",")), fields.WithHelp("Comma-separated sqlite response column names to redact")),
			fields.New("sqlite-rate-limit-requests", fields.TypeInteger, fields.WithDefault(sqliteRuntimeDefaults.RateLimitRequests), fields.WithHelp("Maximum sqlite query requests per rate-limit window")),
			fields.New("sqlite-rate-limit-window-seconds", fields.TypeInteger, fields.WithDefault(int(sqliteRuntimeDefaults.RateLimitWindow/time.Second)), fields.WithHelp("SQLite query rate-limit window in seconds")),
			fields.New("sqlite-max-payload-bytes", fields.TypeInteger, fields.WithDefault(sqliteDefaults.MaxPayloadBytes), fields.WithHelp("Maximum sqlite query response payload bytes before truncation")),
			fields.New("sqlite-audit-log-events", fields.TypeBool, fields.WithDefault(sqliteDefaults.EnableAuditLogEvents), fields.WithHelp("Emit sqlite query audit metadata events in logs")),
			fields.New("arc-enabled", fields.TypeBool, fields.WithDefault(true), fields.WithHelp("Enable ARC-AGI backend module registration")),
			fields.New("arc-driver", fields.TypeString, fields.WithDefault("dagger"), fields.WithHelp("ARC runtime driver (dagger or raw)")),
			fields.New("arc-runtime-mode", fields.TypeString, fields.WithDefault("offline"), fields.WithHelp("ARC operation mode (offline, normal, online)")),
			fields.New("arc-repo-root", fields.TypeString, fields.WithDefault("../go-go-app-arc-agi-3/2026-02-27--arc-agi/ARC-AGI"), fields.WithHelp("Filesystem path to ARC-AGI Python project root")),
			fields.New("arc-startup-timeout-seconds", fields.TypeInteger, fields.WithDefault(45), fields.WithHelp("ARC runtime startup health timeout in seconds")),
			fields.New("arc-request-timeout-seconds", fields.TypeInteger, fields.WithDefault(30), fields.WithHelp("ARC upstream request timeout in seconds")),
			fields.New("arc-raw-listen-addr", fields.TypeString, fields.WithDefault("127.0.0.1:18081"), fields.WithHelp("Loopback listen address for raw ARC runtime mode")),
			fields.New("arc-api-key", fields.TypeString, fields.WithDefault("1234"), fields.WithHelp("X-API-Key header used for ARC requests")),
			fields.New("arc-max-session-events", fields.TypeInteger, fields.WithDefault(200), fields.WithHelp("Maximum ARC session events retained per session")),
			fields.New("federation-registry", fields.TypeString, fields.WithDefault(""), fields.WithHelp("Optional JSON file served at /api/os/federation-registry for frontend remote discovery")),
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
	launcherBootstrap, err := resolveLauncherProfileBootstrap(ctx, parsed)
	if err != nil {
		return errors.Wrap(err, "resolve launcher profile bootstrap")
	}
	defer func() {
		if launcherBootstrap.Close != nil {
			launcherBootstrap.Close()
		}
	}()
	inventoryBuiltinRegistry, err := inventorybackendmodule.LoadBuiltinProfileRegistry()
	if err != nil {
		return errors.Wrap(err, "load inventory builtin profile registry")
	}
	inventoryDefaultProfileSlug := inventorybackendmodule.DefaultProfileSlug()
	if !launcherBootstrap.SelectedProfileSlug.IsZero() && launcherBootstrap.SelectedProfileSlug != gepprofiles.MustEngineProfileSlug("assistant") {
		for _, visibleSlug := range inventorybackendmodule.VisibleProfileSlugs() {
			if visibleSlug == launcherBootstrap.SelectedProfileSlug {
				inventoryDefaultProfileSlug = launcherBootstrap.SelectedProfileSlug
				break
			}
		}
	}
	inventoryProfileRegistry, inventoryDefaultRegistrySlug, err := newAppProfileSurface(ctx, appProfileSurfaceConfig{
		AppID:              inventorybackendmodule.AppID,
		VisibleRegistry:    inventoryBuiltinRegistry,
		DefaultProfileSlug: inventoryDefaultProfileSlug,
		VisibleProfiles:    inventorybackendmodule.VisibleProfileSlugs(),
		FallbackRegistry:   launcherBootstrap.ProfileRegistry,
	})
	if err != nil {
		return errors.Wrap(err, "build inventory profile surface")
	}
	assistantBuiltinRegistry, err := assistantbackendmodule.LoadBuiltinProfileRegistry()
	if err != nil {
		return errors.Wrap(err, "load assistant builtin profile registry")
	}
	assistantProfileRegistry, assistantDefaultRegistrySlug, err := newAppProfileSurface(ctx, appProfileSurfaceConfig{
		AppID:              assistantbackendmodule.AppID,
		VisibleRegistry:    assistantBuiltinRegistry,
		DefaultProfileSlug: assistantbackendmodule.DefaultProfileSlug(),
		VisibleProfiles:    assistantbackendmodule.VisibleProfileSlugs(),
		FallbackRegistry:   launcherBootstrap.ProfileRegistry,
	})
	if err != nil {
		return errors.Wrap(err, "build assistant profile surface")
	}

	composer := pinoweb.NewRuntimeComposer(parsed, pinoweb.RuntimeComposerOptions{
		// These values are launcher-owned fallbacks. When the selected engine profile
		// carries pinocchio.webchat_runtime@v1, the resolved runtime policy overrides them.
		RuntimeKey:   "inventory",
		SystemPrompt: "You are an inventory assistant. Be concise, accurate, and tool-first.",
		AllowedTools: append([]string(nil), inventorytools.InventoryToolNames...),
	})
	pinoweb.RegisterInventoryHypercardExtensions()
	requestResolver := pinoweb.NewStrictRequestResolver("inventory").WithProfileRegistry(
		inventoryProfileRegistry,
		inventoryDefaultRegistrySlug,
	).WithBaseInferenceSettings(launcherBootstrap.BaseInferenceSettings)
	requestResolver = requestResolver.WithDefaultProfileSelection(inventoryDefaultProfileSlug)

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

	assistantContextStore := assistantbackendmodule.NewAppChatContextStore()
	assistantComposer := profilechat.NewRuntimeComposer(parsed, profilechat.RuntimeComposerOptions{
		// Assistant also keeps a minimal code-owned fallback for profiles that omit the
		// Pinocchio runtime extension; profile runtime data remains authoritative when present.
		RuntimeKey:      "assistant",
		SystemPrompt:    "You are a helpful OS assistant. Be concise, clear, and direct.",
		ContextProvider: assistantContextStore,
	}, nil, middlewarecfg.BuildDeps{}, nil)
	assistantRequestResolver := profilechat.NewStrictRequestResolver("assistant").WithProfileRegistry(
		assistantProfileRegistry,
		assistantDefaultRegistrySlug,
	).WithBaseInferenceSettings(launcherBootstrap.BaseInferenceSettings).WithDefaultProfileSelection(
		assistantbackendmodule.DefaultProfileSlug(),
	)
	assistantSrv, err := webchat.NewServer(
		ctx,
		parsed,
		nil,
		webchat.WithRuntimeComposer(assistantComposer),
		webchat.WithDebugRoutesEnabled(os.Getenv("PINOCCHIO_WEBCHAT_DEBUG") == "1"),
	)
	if err != nil {
		return errors.Wrap(err, "new assistant webchat server")
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
	sqliteConfig := sqlitebackend.DefaultModuleConfig()
	sqliteConfig.RuntimeConfig.DBPath = strings.TrimSpace(cfg.SQLiteDB)
	sqliteConfig.RuntimeConfig.ReadOnly = cfg.SQLiteReadOnly
	sqliteConfig.RuntimeConfig.AutoCreate = cfg.SQLiteAutoCreate
	sqliteConfig.RuntimeConfig.DefaultRowLimit = cfg.SQLiteRowLimit
	sqliteConfig.RuntimeConfig.StatementTimeout = time.Duration(cfg.SQLiteTimeoutSeconds) * time.Second
	sqliteConfig.RuntimeConfig.OpenBusyTimeoutMS = cfg.SQLiteBusyTimeoutMS
	sqliteConfig.RuntimeConfig.EnableMultiStatement = cfg.SQLiteMultiStatement
	sqliteConfig.RuntimeConfig.StatementAllowlist = parseCSV(cfg.SQLiteAllowlist)
	sqliteConfig.RuntimeConfig.StatementDenylist = parseCSV(cfg.SQLiteDenylist)
	sqliteConfig.RuntimeConfig.RedactedColumns = parseCSV(cfg.SQLiteRedactColumns)
	sqliteConfig.RuntimeConfig.RateLimitRequests = cfg.SQLiteRateLimit
	sqliteConfig.RuntimeConfig.RateLimitWindow = time.Duration(cfg.SQLiteRateWindowSec) * time.Second
	sqliteConfig.MaxPayloadBytes = cfg.SQLiteMaxPayload
	sqliteConfig.EnableAuditLogEvents = cfg.SQLiteAuditEvents
	sqliteModule, err := sqlitebackend.NewModule(sqliteConfig)
	if err != nil {
		return errors.Wrap(err, "create sqlite backend module")
	}
	assistantModule := assistantbackendmodule.NewModule(assistantbackendmodule.Options{
		Server:              assistantSrv,
		RequestResolver:     assistantRequestResolver,
		ProfileRegistry:     assistantProfileRegistry,
		DefaultRegistrySlug: assistantDefaultRegistrySlug,
		ContextStore:        assistantContextStore,
	})

	modules := []backendhost.AppBackendModule{
		assistantModule,
		inventorybackendmodule.NewModule(inventorybackendmodule.Options{
			Server:                srv,
			RequestResolver:       requestResolver,
			ProfileRegistry:       inventoryProfileRegistry,
			DefaultRegistrySlug:   inventoryDefaultRegistrySlug,
			MiddlewareDefinitions: composer.MiddlewareDefinitions(),
			ConfirmMountPath:      "/confirm",
		}),
		sqliteModule,
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
	assistantModule.SetModuleRegistry(moduleRegistry)
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
	launcherHelpStore := loadLauncherHelpDocStore()
	registerOSHelpEndpoint(appMux, launcherHelpStore)
	registerOSDocsEndpoint(appMux, moduleRegistry, launcherHelpStore, cfg.Root)
	registerOSFederationRegistryEndpoint(appMux, cfg.FederationRegistry)
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
