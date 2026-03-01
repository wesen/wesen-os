---
Title: Building a Full App
Slug: building-a-full-app
Short: End-to-end guide for building a complete wesen-os app with backend module, frontend launcher module, HyperCard VM cards, and packaging — modeled on the inventory and ARC-AGI apps.
Topics:
- tutorial
- backend
- frontend
- hypercard
- full-app
Commands:
- wesen-os-launcher
IsTopLevel: true
IsTemplate: false
ShowPerDefault: true
SectionType: Tutorial
---

This tutorial walks through building a complete wesen-os app from scratch — backend Go module, frontend TypeScript launcher module, optional HyperCard VM cards, and full packaging integration. It follows the same patterns used by the inventory and ARC-AGI apps, using a concrete example app called "task-runner" throughout.

The tutorial is organized into seven phases that mirror the actual development workflow. Phases 1-3 produce a working app with backend and frontend. Phases 4-5 add optional HyperCard card support for interactive UI. Phases 6-7 cover packaging and testing. You can stop after Phase 3 and have a complete, deployable application.

For backend-only development, see `backend-developer-guide`. For frontend-only development, see `frontend-developer-guide`. For launcher operations, see `wesen-os-guide`. For the HyperCard runtime and card system, see `hypercard-environment-guide`.

## How the Pieces Fit Together

Before diving into code, it helps to see the complete picture. A wesen-os app has two halves — a backend module (Go) and a frontend module (TypeScript) — connected by HTTP APIs and identified by a shared app ID string.

```
  +------------------+          HTTP           +------------------+
  |  Frontend Module |  <------------------->  |  Backend Module  |
  |  (TypeScript)    |    /api/apps/<id>/...   |  (Go)            |
  |                  |                          |                  |
  |  manifest.id     |  === must match ===     |  Manifest().AppID|
  |  = "task-runner" |                          |  = "task-runner" |
  |                  |                          |                  |
  |  renderWindow()  |                          |  MountRoutes()   |
  |  buildLaunchWin  |                          |  Init/Start/Stop |
  |  contributions   |                          |  Health/Reflect  |
  +------------------+                          +------------------+
         |                                              |
         |  registered in                               |  registered in
         v                                              v
  modules.tsx                                    main.go
  store.ts                                       go.mod (replace)
  vite.config.ts                                 go.work (use)
```

The composition root — `wesen-os/` — ties both halves together. On the Go side, it imports the backend module, adds it to the module registry, and wires configuration flags. On the TypeScript side, it imports the frontend module through Vite aliases, registers it in the launcher module list, and optionally adds shared reducers to the store.

The seven phases of this tutorial map to this structure:

- **Phase 1** creates the right half (backend module)
- **Phase 2** creates the left half (frontend module)
- **Phase 3** connects them through the composition root
- **Phase 4-5** optionally add HyperCard cards (which run in a sandbox between the two halves)
- **Phase 6-7** package everything into a single binary and test it

## What You'll Build

A complete "task-runner" app that:

- Has a backend module with REST API endpoints for managing tasks.
- Appears as a launchable app in the desktop shell with its own icon.
- Opens a folder window with navigation to task list and detail views.
- Optionally uses HyperCard VM cards for interactive task controls.
- Is packaged into the launcher binary with embedded assets.
- Passes integration tests verifying the full stack.

## Prerequisites

- Running workspace with all repositories cloned as siblings (see `wesen-os-guide`).
- Familiarity with Go HTTP handlers and the `AppBackendModule` contract (see `backend-developer-guide`).
- Familiarity with React/Redux and the `LaunchableAppModule` contract (see `frontend-developer-guide`).

## Phase 1: Backend Module

### 1.1 Create the Module Package

Create a new repository or package for your app. The conventional backend location is `pkg/backendmodule/`.

```go
// pkg/backendmodule/module.go
package backendmodule

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "sync"
    "sync/atomic"

    "github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
)

// Compile-time check.
var _ backendhost.AppBackendModule = (*Module)(nil)
var _ backendhost.ReflectiveAppBackendModule = (*Module)(nil)

type Task struct {
    ID     string `json:"id"`
    Name   string `json:"name"`
    Status string `json:"status"`
}

type Module struct {
    healthy atomic.Bool
    mu      sync.RWMutex
    tasks   map[string]*Task
}

func NewModule() *Module {
    return &Module{
        tasks: make(map[string]*Task),
    }
}
```

The `var _` lines are compile-time checks that fail at build time if your struct is missing any interface method. Always add these before writing the methods.

### 1.2 Implement Manifest and Lifecycle

```go
func (m *Module) Manifest() backendhost.AppBackendManifest {
    return backendhost.AppBackendManifest{
        AppID:        "task-runner",
        Name:         "Task Runner",
        Description:  "Task management and execution module.",
        Capabilities: []string{"tasks", "api", "reflection"},
    }
}

func (m *Module) Init(ctx context.Context) error {
    // In a real module: open DB, load config, validate prerequisites.
    // Seed with demo data for development.
    m.mu.Lock()
    defer m.mu.Unlock()
    m.tasks["task-1"] = &Task{ID: "task-1", Name: "Build frontend", Status: "pending"}
    m.tasks["task-2"] = &Task{ID: "task-2", Name: "Write tests", Status: "running"}
    return nil
}

func (m *Module) Start(ctx context.Context) error {
    m.healthy.Store(true)
    return nil
}

func (m *Module) Stop(ctx context.Context) error {
    m.healthy.Store(false)
    return nil
}

func (m *Module) Health(ctx context.Context) error {
    if !m.healthy.Load() {
        return fmt.Errorf("task-runner: not started or shutting down")
    }
    return nil
}
```

**Key points:** Health checks should verify real readiness (DB connections, worker status). The example is simplified; a production module would check database handles and background worker liveness.

### 1.3 Implement Routes

```go
func (m *Module) MountRoutes(mux *http.ServeMux) error {
    mux.HandleFunc("GET /health", m.handleHealth)
    mux.HandleFunc("GET /tasks", m.handleListTasks)
    mux.HandleFunc("POST /tasks", m.handleCreateTask)
    mux.HandleFunc("GET /tasks/{id}", m.handleGetTask)
    mux.HandleFunc("PUT /tasks/{id}", m.handleUpdateTask)
    mux.HandleFunc("GET /schemas/", m.handleSchemas)
    return nil
}

func (m *Module) handleHealth(w http.ResponseWriter, r *http.Request) {
    if err := m.Health(r.Context()); err != nil {
        http.Error(w, err.Error(), http.StatusServiceUnavailable)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    _, _ = w.Write([]byte(`{"status":"ok"}`))
}

func (m *Module) handleListTasks(w http.ResponseWriter, r *http.Request) {
    m.mu.RLock()
    defer m.mu.RUnlock()

    tasks := make([]*Task, 0, len(m.tasks))
    for _, t := range m.tasks {
        tasks = append(tasks, t)
    }

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]any{"tasks": tasks})
}

func (m *Module) handleCreateTask(w http.ResponseWriter, r *http.Request) {
    var task Task
    if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
        http.Error(w, "invalid json", http.StatusBadRequest)
        return
    }
    if task.ID == "" {
        task.ID = fmt.Sprintf("task-%d", len(m.tasks)+1)
    }

    m.mu.Lock()
    m.tasks[task.ID] = &task
    m.mu.Unlock()

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    _ = json.NewEncoder(w).Encode(task)
}

func (m *Module) handleGetTask(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")

    m.mu.RLock()
    task, ok := m.tasks[id]
    m.mu.RUnlock()

    if !ok {
        http.NotFound(w, r)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(task)
}

func (m *Module) handleUpdateTask(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")

    m.mu.Lock()
    defer m.mu.Unlock()

    task, ok := m.tasks[id]
    if !ok {
        http.NotFound(w, r)
        return
    }

    var update Task
    if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
        http.Error(w, "invalid json", http.StatusBadRequest)
        return
    }
    if update.Name != "" {
        task.Name = update.Name
    }
    if update.Status != "" {
        task.Status = update.Status
    }

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(task)
}

func (m *Module) handleSchemas(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    _, _ = w.Write([]byte(`{"schemas":[]}`))
}
```

**Remember:** These routes are registered without the `/api/apps/task-runner/` prefix. The backendhost layer adds it automatically. The effective URLs will be `/api/apps/task-runner/tasks`, `/api/apps/task-runner/tasks/{id}`, etc.

### 1.4 Add Reflection

```go
func (m *Module) Reflection(ctx context.Context) (*backendhost.ModuleReflectionDocument, error) {
    return &backendhost.ModuleReflectionDocument{
        AppID:   "task-runner",
        Name:    "Task Runner",
        Version: "v1",
        Summary: "Task management and execution module with CRUD API.",
        Capabilities: []backendhost.ReflectionCapability{
            {ID: "tasks", Stability: "stable", Description: "Task CRUD operations"},
            {ID: "api", Stability: "stable"},
            {ID: "reflection", Stability: "stable"},
        },
        APIs: []backendhost.ReflectionAPI{
            {ID: "list-tasks", Method: "GET", Path: "/api/apps/task-runner/tasks",
                Summary: "List all tasks"},
            {ID: "create-task", Method: "POST", Path: "/api/apps/task-runner/tasks",
                Summary: "Create a new task"},
            {ID: "get-task", Method: "GET", Path: "/api/apps/task-runner/tasks/{id}",
                Summary: "Get a task by ID"},
            {ID: "update-task", Method: "PUT", Path: "/api/apps/task-runner/tasks/{id}",
                Summary: "Update a task"},
        },
    }, nil
}
```

### 1.5 Write Backend Tests

```go
// pkg/backendmodule/module_test.go
package backendmodule

import (
    "context"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/go-go-golems/go-go-os-backend/pkg/backendhost"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestManifest(t *testing.T) {
    m := NewModule()
    manifest := m.Manifest()
    assert.Equal(t, "task-runner", manifest.AppID)
    assert.NotEmpty(t, manifest.Name)
    assert.NoError(t, backendhost.ValidateAppID(manifest.AppID))
}

func TestHealthLifecycle(t *testing.T) {
    m := NewModule()
    assert.Error(t, m.Health(context.Background()))

    require.NoError(t, m.Init(context.Background()))
    require.NoError(t, m.Start(context.Background()))
    assert.NoError(t, m.Health(context.Background()))

    require.NoError(t, m.Stop(context.Background()))
    assert.Error(t, m.Health(context.Background()))
}

func TestRoutes(t *testing.T) {
    m := NewModule()
    require.NoError(t, m.Init(context.Background()))
    require.NoError(t, m.Start(context.Background()))
    defer m.Stop(context.Background())

    mux := http.NewServeMux()
    require.NoError(t, m.MountRoutes(mux))

    req := httptest.NewRequest("GET", "/tasks", nil)
    rec := httptest.NewRecorder()
    mux.ServeHTTP(rec, req)
    assert.Equal(t, http.StatusOK, rec.Code)
}

func TestNamespacedRoutes(t *testing.T) {
    m := NewModule()
    require.NoError(t, m.Init(context.Background()))
    require.NoError(t, m.Start(context.Background()))
    defer m.Stop(context.Background())

    appMux := http.NewServeMux()
    require.NoError(t, backendhost.MountNamespacedRoutes(
        appMux, m.Manifest().AppID, m.MountRoutes))

    req := httptest.NewRequest("GET", "/api/apps/task-runner/tasks", nil)
    rec := httptest.NewRecorder()
    appMux.ServeHTTP(rec, req)
    assert.Equal(t, http.StatusOK, rec.Code)
}
```

### 1.6 Wire into Launcher Composition

**Step 1:** If your module needs an adapter, create one in `wesen-os/pkg/taskrunner/module.go`. If it implements `AppBackendModule` directly, skip this.

**Step 2:** Add to `wesen-os/cmd/wesen-os-launcher/main.go`:

```go
import taskrunner "github.com/go-go-golems/task-runner-repo/pkg/backendmodule"

// In RunIntoWriter, before module registry creation:
taskRunnerModule := taskrunner.NewModule()

modules := []backendhost.AppBackendModule{
    inventoryModule,
    gepaModule,
    taskRunnerModule,
}
```

**Step 3:** Add `replace` directive in `wesen-os/go.mod`:

```
replace github.com/go-go-golems/task-runner-repo => ../task-runner-repo
```

**Step 4:** Add to root `go.work`:

```
use (
    ./task-runner-repo
    // ... existing entries
)
```

**Step 5:** Verify:

```bash
go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8091

# In another terminal:
curl -sS http://127.0.0.1:8091/api/os/apps | jq '.apps[] | select(.app_id=="task-runner")'
curl -sS http://127.0.0.1:8091/api/apps/task-runner/tasks | jq .
curl -sS http://127.0.0.1:8091/api/os/apps/task-runner/reflection | jq .
```

At this point you have a working backend module. The frontend shows no icon yet — that comes in Phase 2.

## Phase 2: Frontend Launcher Module

### 2.1 Create the Module Package

Create the frontend app directory:

```
task-runner-repo/
  apps/
    task-runner/
      src/
        launcher/
          module.tsx
          renderTaskRunner.tsx
          public.ts
        features/
          tasks/
            tasksSlice.ts
        reducers.ts
```

### 2.2 Define the Module

```tsx
// apps/task-runner/src/launcher/module.tsx
import type { LaunchableAppModule, LaunchReason } from '@hypercard/desktop-os';
import type { OpenWindowPayload } from '@hypercard/engine/desktop-core';
import type { ReactNode } from 'react';
import { TaskRunnerWindow } from './renderTaskRunner';

const APP_ID = 'task-runner';

function buildFolderWindow(reason: LaunchReason): OpenWindowPayload {
  return {
    id: `window:${APP_ID}:folder`,
    title: 'Task Runner',
    icon: '⚡',
    bounds: { x: 92, y: 44, w: 500, h: 400 },
    content: { kind: 'app', appKey: `${APP_ID}:folder` },
    dedupeKey: `${APP_ID}:folder`,
  };
}

export const taskRunnerLauncherModule: LaunchableAppModule = {
  manifest: {
    id: APP_ID,
    name: 'Task Runner',
    icon: '⚡',
    launch: { mode: 'window' },
    desktop: { order: 50 },
  },

  state: {
    stateKey: 'app_task_runner',
    reducer: (state = { launchCount: 0 }) => state,
  },

  buildLaunchWindow: (_ctx, reason) => buildFolderWindow(reason),

  renderWindow: ({ instanceId, windowId, ctx }): ReactNode => {
    const apiBase = ctx.resolveApiBase?.(APP_ID) ?? `/api/apps/${APP_ID}`;
    return <TaskRunnerWindow instanceId={instanceId} windowId={windowId} apiBase={apiBase} />;
  },
};
```

**Key points:**
- `manifest.id` is `'task-runner'` — matches the backend's `Manifest().AppID` exactly.
- `state.stateKey` follows the `app_<name>` convention.
- `renderWindow` uses `ctx.resolveApiBase` instead of hardcoded paths.
- `desktop.order: 50` places the icon between existing apps.

### 2.3 Implement the Window Component

```tsx
// apps/task-runner/src/launcher/renderTaskRunner.tsx
import { useState, useEffect, useCallback } from 'react';

interface Task {
  id: string;
  name: string;
  status: string;
}

export interface TaskRunnerWindowProps {
  instanceId: string;
  windowId: string;
  apiBase: string;
}

export function TaskRunnerWindow({ instanceId, apiBase }: TaskRunnerWindowProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${apiBase}/tasks`);
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  }, [apiBase]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  if (loading) return <div style={{ padding: 16 }}>Loading tasks...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 12px' }}>Task Runner</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 6, borderBottom: '1px solid #ddd' }}>Name</th>
            <th style={{ textAlign: 'left', padding: 6, borderBottom: '1px solid #ddd' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td style={{ padding: 6 }}>{task.name}</td>
              <td style={{ padding: 6 }}>{task.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={fetchTasks} style={{ marginTop: 12 }}>
        Refresh
      </button>
    </div>
  );
}
```

### 2.4 Create Public Exports

```ts
// apps/task-runner/src/launcher/public.ts
export { taskRunnerLauncherModule } from './module';
```

```ts
// apps/task-runner/src/reducers.ts
// Export shared reducers if any domain data needs to be in the shared store.
// For a simple app, this can be empty or export the tasks slice.
export {};
```

## Phase 3: Register in Launcher Shell

### 3.1 Add Module Import

Edit `wesen-os/apps/os-launcher/src/app/modules.tsx`:

```tsx
import { taskRunnerLauncherModule } from '@hypercard/task-runner/launcher';

export const launcherModules: LaunchableAppModule[] = [
  inventoryLauncherModule,
  todoLauncherModule,
  // ... existing modules
  taskRunnerLauncherModule,
];
```

### 3.2 Add Vite Aliases

Edit `wesen-os/apps/os-launcher/vite.config.ts` to add aliases in the `resolve.alias` section:

```ts
'@hypercard/task-runner/launcher': path.resolve(
  workspaceRoot,
  'task-runner-repo/apps/task-runner/src/launcher/public.ts',
),
'@hypercard/task-runner/reducers': path.resolve(
  workspaceRoot,
  'task-runner-repo/apps/task-runner/src/reducers.ts',
),
'@hypercard/task-runner': path.resolve(
  workspaceRoot,
  'task-runner-repo/apps/task-runner/src',
),
```

### 3.3 Add Vite Proxy Rules

Add proxy rules in the `server.proxy` section of `vite.config.ts`:

```ts
'/api/apps/task-runner': {
  target: inventoryBackendTarget,  // Same backend serves all apps
  changeOrigin: true,
},
```

### 3.4 Add Shared Reducers (If Needed)

If your app exports domain reducers that other modules need, add them in `wesen-os/apps/os-launcher/src/app/store.ts`:

```ts
import { tasksReducer } from '@hypercard/task-runner/reducers';

export const { store } = createLauncherStore(launcherModules, {
  sharedReducers: {
    // ... existing reducers
    tasks: tasksReducer,  // Only if other modules need to read task data
  },
});
```

For a simple app where only the app's own window reads the data, skip this step and fetch data directly via API calls.

### 3.5 Verify Frontend Integration

Start both backend and frontend:

```bash
# Terminal 1
go run ./cmd/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8091

# Terminal 2
npm run dev -w apps/os-launcher
```

Open `http://127.0.0.1:5173/`. You should see the Task Runner icon on the desktop. Click it to open the window. The task list should load from the backend API.

At this point you have a complete working app with backend and frontend. Phases 4-5 are optional for apps that need interactive HyperCard cards.

## Phase 4: HyperCard VM Cards (Optional)

### 4.1 Define the Stack

```ts
// apps/task-runner/src/domain/stack.ts
import type { StackDefinition } from '@hypercard/hypercard-runtime';
import bundleCode from './pluginBundle.vm.js?raw';

export const TASK_RUNNER_STACK: StackDefinition = {
  id: 'task-runner-stack',
  name: 'Task Runner Cards',
  homeCard: 'taskList',
  bundleCode,
  cards: ['taskList', 'taskDetail'],
};
```

The `?raw` import loads the JavaScript bundle as a string. This code runs inside QuickJS, not in the browser.

### 4.2 Author the Plugin Bundle

```js
// apps/task-runner/src/domain/pluginBundle.vm.js
defineStackBundle(function() {

  defineCard('taskList', {
    render: function(state) {
      var items = (state.session && state.session.tasks) || [];
      var children = [
        { type: 'text', value: 'Tasks', style: { fontSize: 18, fontWeight: 'bold' } },
      ];

      for (var i = 0; i < items.length; i++) {
        children.push({
          type: 'button',
          label: items[i].name + ' [' + items[i].status + ']',
          event: 'selectTask',
          args: { taskId: items[i].id, taskName: items[i].name },
        });
      }

      children.push({
        type: 'button',
        label: 'Refresh',
        event: 'refresh',
      });

      return { type: 'column', children: children };
    },

    handlers: {
      refresh: function(ctx) {
        // Request tasks from backend via domain action
        ctx.dispatchDomainAction('task-runner', 'fetchTasks', {});
      },

      selectTask: function(ctx, args) {
        // Store selected task in session state and navigate to detail card
        ctx.dispatchSessionAction('patch', { selectedTaskId: args.taskId });
        ctx.dispatchSystemCommand('navigate', { card: 'taskDetail' });
      },
    },
  });

  defineCard('taskDetail', {
    render: function(state) {
      var taskId = state.session && state.session.selectedTaskId;
      return {
        type: 'column',
        children: [
          { type: 'text', value: 'Task: ' + (taskId || 'none selected') },
          { type: 'button', label: 'Mark Complete', event: 'complete' },
          { type: 'button', label: 'Back to List', event: 'back' },
        ],
      };
    },

    handlers: {
      complete: function(ctx) {
        var taskId = ctx.getSessionState().selectedTaskId;
        if (taskId) {
          ctx.dispatchDomainAction('task-runner', 'completeTask', { taskId: taskId });
          ctx.dispatchSystemCommand('notify', { message: 'Task marked complete' });
        }
      },

      back: function(ctx) {
        ctx.dispatchSystemCommand('navigate', { card: 'taskList' });
      },
    },
  });

});
```

### 4.3 Wire Domain Intent Handling

For the direct reducer pattern (simplest approach), add cases to your Redux slice:

```ts
// apps/task-runner/src/features/tasks/tasksSlice.ts
import { createSlice } from '@reduxjs/toolkit';

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: { items: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    // Handle domain intents from VM card handlers
    builder.addCase('task-runner/fetchTasks', (state) => {
      state.loading = true;
      // In a real app, this would trigger an API call via middleware
    });
    builder.addCase('task-runner/completeTask', (state, action) => {
      const { taskId } = action.payload;
      const task = state.items.find((t) => t.id === taskId);
      if (task) {
        task.status = 'complete';
      }
    });
  },
});

export const tasksReducer = tasksSlice.reducer;
```

For async API calls, use the bridge middleware pattern (see `frontend-developer-guide` for the full pattern with middleware, effect host, and state slice).

### 4.4 Add Card Windows

Update your module to support card windows via a window content adapter:

```tsx
// In module.tsx, add to createContributions:
import { PluginCardSessionHost } from '@hypercard/hypercard-runtime';
import { TASK_RUNNER_STACK } from '../domain/stack';

createContributions: (ctx): DesktopContribution[] => [{
  id: 'task-runner.adapters',
  windowContentAdapters: [{
    id: 'task-runner.card-adapter',
    canRender: (window) =>
      window.content.kind === 'card' &&
      window.content.card?.stackId === TASK_RUNNER_STACK.id,
    render: (window) => (
      <PluginCardSessionHost
        windowId={window.id}
        sessionId={window.content.card!.cardSessionId}
        stack={TASK_RUNNER_STACK}
      />
    ),
  }],
}],
```

And add a way to open card windows (for example, from a folder window or command):

```ts
function buildCardWindow(): OpenWindowPayload {
  const sessionId = `task-runner-session-${crypto.randomUUID()}`;
  return {
    id: `window:task-runner:card:${sessionId}`,
    title: 'Task Runner Cards',
    icon: '🃏',
    bounds: { x: 120, y: 44, w: 700, h: 500 },
    content: {
      kind: 'card',
      card: {
        stackId: TASK_RUNNER_STACK.id,
        cardId: TASK_RUNNER_STACK.homeCard,
        cardSessionId: sessionId,
      },
    },
  };
}
```

## Phase 5: Backend-Generated Runtime Cards (Optional)

This phase is for apps where the backend dynamically generates card definitions at runtime, like inventory's hypercard widgets. Skip this if your cards are all statically defined in the plugin bundle.

### 5.1 Register SEM Event Mappings

In your backend, register hypercard SEM mappings that produce structured event envelopes:

```go
// In your backend module or event registration:
pinoweb.RegisterHypercardSEMMapping("hypercard.card.v2", func(data map[string]any) {
    // Construct a timeline event with runtimeCardId and runtimeCardCode fields.
    // These fields are what the artifact projection middleware looks for.
})
```

The event must include `runtimeCardId` (a unique identifier) and `runtimeCardCode` (valid JavaScript that calls `defineCard`).

### 5.2 Register Chat Runtime Module

In your frontend module's setup, ensure the hypercard timeline module is registered:

```ts
import {
  ensureChatModulesRegistered,
  registerChatRuntimeModule,
} from '@hypercard/chat-runtime';
import { registerHypercardTimelineModule } from '@hypercard/hypercard-runtime';

// Call during module initialization (e.g., in onRegister or at module scope):
registerChatRuntimeModule({
  id: 'chat.task-runner-timeline',
  register: registerHypercardTimelineModule,
});
ensureChatModulesRegistered();
```

### 5.3 Verify Artifact Projection

The pipeline is: backend SEM event → WebSocket → timeline mapper (normalizes event) → artifact projection middleware (extracts `runtimeCardId`/`runtimeCardCode`) → `registerRuntimeCard` → `PluginCardSessionHost.injectPendingCardsWithReport`.

To verify each step:

1. Check the backend emits the event with correct fields.
2. Check the WebSocket delivers the envelope.
3. Check the timeline mapper produces a timeline entity.
4. Check the artifact projection extracts the card.
5. Check the session host injects the card.

Use the hypercard-tools debug panel in the launcher to inspect the runtime timeline.

## Phase 6: Packaging and Build

### 6.1 Frontend Build Integration

Your app's source code is bundled into the launcher frontend automatically — Vite resolves it through the aliases you added in Phase 3.2. No additional frontend build configuration is needed.

### 6.2 Backend Build Integration

Your Go module is imported by `wesen-os` through the `replace` directive and `go.work` entry from Phase 1.6. The Go build includes it automatically.

### 6.3 Build the Binary

```bash
cd wesen-os
npm run launcher:binary:build
```

This chains: frontend build → dist sync → Go binary build → `build/wesen-os-launcher`.

### 6.4 Run Smoke Tests

```bash
./build/wesen-os-launcher wesen-os-launcher --arc-enabled=false --addr 127.0.0.1:8091
```

Then verify:

```bash
# Module in manifest
curl -sS http://127.0.0.1:8091/api/os/apps | jq '.apps[] | select(.app_id=="task-runner")'

# Reflection available
curl -sS http://127.0.0.1:8091/api/os/apps/task-runner/reflection | jq .

# API routes work
curl -sS http://127.0.0.1:8091/api/apps/task-runner/tasks | jq .

# Frontend loads (check for app icon in browser)
open http://127.0.0.1:8091/
```

## Phase 7: Integration Tests

### 7.1 Backend Integration Tests

Add test cases to `wesen-os/cmd/wesen-os-launcher/main_integration_test.go`:

```go
func TestTaskRunnerModuleInManifest(t *testing.T) {
    // Start full launcher (shared setup from existing tests)
    resp, err := http.Get(baseURL + "/api/os/apps")
    require.NoError(t, err)
    defer resp.Body.Close()

    var result struct {
        Apps []struct {
            AppID   string `json:"app_id"`
            Healthy bool   `json:"healthy"`
        } `json:"apps"`
    }
    require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))

    found := false
    for _, app := range result.Apps {
        if app.AppID == "task-runner" {
            found = true
            assert.True(t, app.Healthy)
        }
    }
    assert.True(t, found, "task-runner should appear in /api/os/apps")
}

func TestTaskRunnerRoutes(t *testing.T) {
    resp, err := http.Get(baseURL + "/api/apps/task-runner/tasks")
    require.NoError(t, err)
    defer resp.Body.Close()
    assert.Equal(t, http.StatusOK, resp.StatusCode)
}
```

### 7.2 Frontend Tests

For module contract tests:

```ts
import { taskRunnerLauncherModule } from './module';
import { assertValidManifest } from '@hypercard/desktop-os';

test('manifest is valid', () => {
  assertValidManifest(taskRunnerLauncherModule.manifest);
});

test('buildLaunchWindow returns valid payload', () => {
  const ctx = {
    dispatch: vi.fn(), getState: vi.fn(),
    openWindow: vi.fn(), closeWindow: vi.fn(),
    resolveApiBase: (id: string) => `/api/apps/${id}`,
    resolveWsBase: (id: string) => `/api/apps/${id}/ws`,
  };
  const payload = taskRunnerLauncherModule.buildLaunchWindow(ctx, 'icon');
  expect(payload.id).toBeTruthy();
  expect(payload.content.kind).toBe('app');
});
```

## Complete Checklist

### Identity and Contracts
- [ ] App ID `task-runner` consistent across backend manifest, frontend manifest, URL paths.
- [ ] Backend `AppBackendModule` implemented with `var _` compile-time check.
- [ ] Frontend `LaunchableAppModule` implemented with valid manifest.
- [ ] State key `app_task_runner` unique and follows convention.

### Backend
- [ ] Routes registered without namespace prefix.
- [ ] Lifecycle methods implemented with meaningful health checks.
- [ ] Reflection document created.
- [ ] Backend tests pass (manifest, routes, health, namespace mount).

### Frontend
- [ ] Module registered in `modules.tsx`.
- [ ] Vite aliases added for `/launcher`, `/reducers`, and base path.
- [ ] Vite proxy rules added for `/api/apps/task-runner`.
- [ ] Shared reducers registered in `store.ts` (if needed).
- [ ] Window rendering uses `ctx.resolveApiBase` (not hardcoded paths).

### Composition
- [ ] Backend module added to `main.go` `modules` slice.
- [ ] `replace` directive added to `wesen-os/go.mod`.
- [ ] Entry added to root `go.work`.
- [ ] `npm run launcher:binary:build` succeeds.

### Verification
- [ ] `GET /api/os/apps` includes `task-runner` with `healthy: true`.
- [ ] `GET /api/os/apps/task-runner/reflection` returns metadata.
- [ ] Desktop icon visible at position defined by `desktop.order`.
- [ ] Clicking icon opens window that loads data from backend.
- [ ] Integration tests pass.

### Optional: VM Cards
- [ ] Stack definition with bundle code.
- [ ] Plugin bundle defines cards with render and handler functions.
- [ ] Domain intents match reducer/middleware action types exactly.
- [ ] Window content adapter registered for card windows.
- [ ] Card window opens and renders with functional handlers.

## Case Study: How Inventory Was Built

The inventory app is the most complete implementation. Here's how it maps to each phase:

**Backend (Phase 1):** `go-go-app-inventory/pkg/backendcomponent/component.go` implements a custom `Component` contract. `go-go-app-inventory/pkg/backendmodule/module.go` wraps it into `AppBackendModule` in the inventory repository itself. App ID is `inventory`. The webchat server provides chat/WebSocket endpoints. Hypercard SEM events are registered in `go-go-app-inventory/pkg/pinoweb/hypercard_events.go`.

**Frontend (Phase 2):** `go-go-app-inventory/apps/inventory/src/launcher/module.tsx` defines the launcher module. The massive `renderInventoryApp.tsx` (1000+ lines) implements all window types, contributions, chat integration, card adapters, context menus, and debug tools.

**Registration (Phase 3):** Imported in `wesen-os/apps/os-launcher/src/app/modules.tsx`. Vite aliases for `@hypercard/inventory/launcher`, `@hypercard/inventory/reducers`, and `@hypercard/inventory`. Shared reducers `inventory` and `sales` in `store.ts`.

**VM Cards (Phase 4):** Stack defined in `apps/inventory/src/domain/stack.ts`. Plugin bundle in `apps/inventory/src/domain/pluginBundle.vm.js`. Domain intents like `inventory/updateQty`, `inventory/saveItem` match the inventory reducer.

**Runtime Cards (Phase 5):** Backend SEM events registered via `pinoweb.RegisterInventoryHypercardExtensions()`. Frontend registers `registerHypercardTimelineModule` during module initialization.

## Case Study: How ARC-AGI Was Built

The ARC app demonstrates a different architectural approach with bridge middleware and isolated stores.

**Backend (Phase 1):** `go-go-app-arc-agi-3/pkg/backendmodule/module.go` implements `AppBackendModule` directly. Config normalization sets defaults for driver, runtime mode, API key, and timeouts. Reflection is configurable via `EnableReflection`.

**Frontend (Phase 2):** `go-go-app-arc-agi-3/apps/arc-agi-player/src/launcher/module.tsx` defines the module with no `state` config (no private launcher state). Each window instance creates its own Redux store via `ArcPlayerHost`, isolating game state between windows.

**Multiple Window Types:** The module uses two window content adapters: `createArcDemoCardAdapter()` for HyperCard card windows, and `createArcPlayerAdapter()` for folder and React game player windows. The `renderWindow` method handles the default folder case.

**Bridge Pattern (Phase 4 alternative):** Instead of direct reducers, ARC uses bridge middleware (`bridge/middleware.ts`) that intercepts `arc/command.request` actions, makes API calls to `/api/apps/arc-agi/sessions/{id}/action`, and dispatches response actions. The `ArcPendingIntentEffectHost` component watches for pending intents and feeds API results back into the VM session state.

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| App ID mismatch between backend and frontend | Different strings in Go and TypeScript | Make `Manifest().AppID` and `manifest.id` identical |
| Double-prefixed routes (`/api/apps/x/api/apps/x/...`) | Namespace prefix hardcoded in `MountRoutes` | Remove prefix; backendhost adds it |
| Frontend build fails with module resolution error | Missing Vite alias for imported package | Add alias in `vite.config.ts` |
| API calls return 404 in Vite dev mode | Missing proxy rule | Add proxy for `/api/apps/<app-id>` in `vite.config.ts` |
| VM handler runs but state doesn't update | Domain action type mismatch | Verify `<domain>/<actionType>` matches reducer case exactly |
| Runtime card not rendered | Missing SEM mapping, broken timeline pipeline, or missing chat module registration | Check each step of the injection chain |
| Binary serves old UI without new app | Build pipeline stages skipped | Run `npm run launcher:binary:build` (full chain) |
| Module not in `/api/os/apps` | Module not added to `modules` slice | Add before `NewModuleRegistry` call in `main.go` |
| `go build` fails with module not found | Missing `replace` directive | Add to `wesen-os/go.mod` |

## See Also

- `wesen-os-guide` — Workspace setup, configuration, and troubleshooting
- `backend-developer-guide` — Detailed backend contract reference
- `frontend-developer-guide` — Detailed frontend contract reference
