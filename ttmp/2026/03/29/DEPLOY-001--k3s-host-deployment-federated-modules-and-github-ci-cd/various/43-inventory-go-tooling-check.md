== inventory go tool vmmeta check ==
repo: /home/manuel/workspaces/2026-03-02/os-openai-app-server/wesen-os/workspace-links/go-go-app-inventory

-- pinned tool declaration --
module github.com/go-go-golems/go-go-app-inventory/tools

go 1.26.1

tool github.com/go-go-golems/go-go-os-backend/cmd/go-go-os-backend

require (
	github.com/aymanbagabas/go-osc52/v2 v2.0.1 // indirect
	github.com/charmbracelet/colorprofile v0.4.1 // indirect
	github.com/charmbracelet/lipgloss v1.1.1-0.20250404203927-76690c660834 // indirect
	github.com/charmbracelet/x/ansi v0.11.6 // indirect
	github.com/charmbracelet/x/cellbuf v0.0.15 // indirect
	github.com/charmbracelet/x/term v0.2.2 // indirect
	github.com/clipperhouse/displaywidth v0.9.0 // indirect
	github.com/clipperhouse/stringish v0.1.1 // indirect
	github.com/clipperhouse/uax29/v2 v2.5.0 // indirect
	github.com/dlclark/regexp2 v1.11.5 // indirect
	github.com/dop251/goja v0.0.0-20250630131328-58d95d85e994 // indirect
	github.com/go-go-golems/go-go-goja v0.4.2 // indirect
	github.com/go-go-golems/go-go-os-backend v0.0.5 // indirect
	github.com/go-sourcemap/sourcemap v2.1.4+incompatible // indirect
	github.com/google/pprof v0.0.0-20241029153458-d1b30febd7db // indirect
	github.com/inconshreveable/mousetrap v1.1.0 // indirect
	github.com/lucasb-eyer/go-colorful v1.3.0 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/mattn/go-pointer v0.0.1 // indirect
	github.com/mattn/go-runewidth v0.0.19 // indirect
	github.com/muesli/termenv v0.16.0 // indirect
	github.com/pkg/errors v0.9.1 // indirect
	github.com/rivo/uniseg v0.4.7 // indirect
	github.com/spf13/cobra v1.10.1 // indirect
	github.com/spf13/pflag v1.0.10 // indirect
	github.com/tree-sitter/go-tree-sitter v0.25.0 // indirect
	github.com/tree-sitter/tree-sitter-javascript v0.25.0 // indirect
	github.com/xo/terminfo v0.0.0-20220910002029-abceb7e1c41e // indirect
	golang.org/x/sys v0.41.0 // indirect
	golang.org/x/text v0.34.0 // indirect
)

-- tool help --
Usage:
  go-go-os-backend [command]

Available Commands:
  completion  Generate the autocompletion script for the specified shell
  help        Help about any command
  vmmeta      Generate VM metadata and docs artifacts from authored card sources

Flags:
  -h, --help   help for go-go-os-backend

Use "go-go-os-backend [command] --help" for more information about a command.

-- vmmeta generation --

-- federation build --

> @go-go-golems/inventory@0.1.0 build:federation
> npm run vmmeta:generate && vite build --config vite.federation.config.ts


> @go-go-golems/inventory@0.1.0 vmmeta:generate
> ../../scripts/generate_inventory_vmmeta.sh

vite v6.4.1 building for production...
transforming...
✓ 506 modules transformed.
rendering chunks...
computing gzip size...
dist-federation/mf-manifest.json                0.19 kB │ gzip:   0.15 kB
dist-federation/inventory-host-contract.js  2,584.01 kB │ gzip: 930.62 kB │ map: 4,458.96 kB
✓ built in 3.34s
