import type { RuntimeBundleDefinition } from '@go-go-golems/os-core';
import { openWindow } from '@go-go-golems/os-core/desktop-core';
import type { LaunchableAppModule, LaunchReason } from '@go-go-golems/os-shell';
import {
  buildArtifactOpenWindowPayload,
  buildRuntimeDebugWindowPayload,
  getPendingRuntimeSurfaces,
  HYPERCARD_RUNTIME_DEBUG_APP_ID,
  onRegistryChange,
  registerRuntimeDebugStacks,
  RuntimeDebugAppWindow,
} from '@go-go-golems/os-scripting';
import { useEffect, useState, type ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { STACK } from '../domain/stack';
import { listRuntimeFederatedRuntimeBundles } from './localFederatedAppContracts';

const RUNTIME_DEBUG_STACKS: RuntimeBundleDefinition[] = [...listRuntimeFederatedRuntimeBundles(), STACK];

registerRuntimeDebugStacks(RUNTIME_DEBUG_STACKS);

function buildLaunchWindow(_reason: LaunchReason) {
  return buildRuntimeDebugWindowPayload({
    appId: HYPERCARD_RUNTIME_DEBUG_APP_ID,
  });
}

// GeneratedCardsSection lists model-generated runtime cards (registered via
// registerRuntimeSurface by the inventory.codeCard chat widget) with an Open
// action. RuntimeSurfaceDebugWindow's own registry section shows these entries
// Edit-only; opening routes through buildArtifactOpenWindowPayload → the
// inventory surface window adapter (RuntimeSurfaceSessionHost), which injects
// the registered code into the session. Delete this section once os-scripting
// ships an Open button in its registry section (ticket
// WESEN-OS-ASSISTANT-PARITY-2026-07 Phase 6).
function GeneratedCardsSection() {
  const dispatch = useDispatch();
  const [cards, setCards] = useState(() => getPendingRuntimeSurfaces());

  useEffect(() => onRegistryChange(() => setCards(getPendingRuntimeSurfaces())), []);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div
      data-part="generated-cards"
      style={{ borderBottom: '1px solid #ddd', padding: '6px 8px', fontFamily: 'monospace', fontSize: 12 }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>🃏 Generated cards ({cards.length})</div>
      {cards.map((card) => (
        <div key={card.surfaceId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
          <span style={{ fontWeight: 600 }}>{card.surfaceId}</span>
          <span style={{ color: '#888', fontSize: 10 }}>{card.packId}</span>
          <span style={{ color: '#aaa', fontSize: 10 }}>{new Date(card.registeredAt).toLocaleTimeString()}</span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            style={{ padding: '1px 8px', fontSize: 11, cursor: 'pointer' }}
            onClick={() => {
              const payload = buildArtifactOpenWindowPayload({
                artifactId: card.surfaceId,
                runtimeSurfaceId: card.surfaceId,
                bundleId: STACK.id,
                title: card.surfaceId,
              });
              if (payload) {
                dispatch(openWindow(payload));
              }
            }}
          >
            ▶ Open
          </button>
        </div>
      ))}
    </div>
  );
}

export const runtimeDebugLauncherModule: LaunchableAppModule = {
  manifest: {
    id: HYPERCARD_RUNTIME_DEBUG_APP_ID,
    name: 'Stacks & Cards',
    icon: '🔧',
    launch: { mode: 'window' },
    desktop: {
      order: 89,
    },
  },
  buildLaunchWindow: (_ctx, reason) => buildLaunchWindow(reason),
  renderWindow: ({ instanceId }): ReactNode => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <GeneratedCardsSection />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <RuntimeDebugAppWindow
          ownerAppId={HYPERCARD_RUNTIME_DEBUG_APP_ID}
          instanceId={instanceId}
          bundles={RUNTIME_DEBUG_STACKS}
        />
      </div>
    </div>
  ),
};
