---
Title: Intern Execution Notes
Ticket: OS-06
Status: active
Topics:
    - frontend
    - documentation
    - apps-browser
    - launcher
    - wesen-os
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/launcher/module.tsx
      Note: Primary command/menu integration file.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocCenterHome.tsx
      Note: Home screen behavior to split by browser mode.
    - Path: /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend/apps/apps-browser/src/components/doc-browser/DocReaderScreen.tsx
      Note: Reader endpoint selection by mode.
ExternalSources: []
Summary: Quick-start execution notes and handoff checklist for OS-06 implementation.
LastUpdated: 2026-03-01T23:20:00-05:00
WhatFor: Help an intern execute OS-06 without re-discovering architecture constraints.
WhenToUse: Read before first code commit on OS-06.
---

# Intern Execution Notes

## First-Day Checklist

1. Read OS-06 implementation guide end-to-end.
2. Run launcher menu runtime tests to establish baseline.
3. Verify backend help endpoints return data before touching frontend code.

## Commands To Run Before Coding

```bash
# Backend sanity
curl -s http://127.0.0.1:8091/api/os/help | jq '.module_id, (.docs|length)'
curl -s http://127.0.0.1:8091/api/os/help/wesen-os-guide | jq '.slug, (.content|length)'

# Frontend baseline tests (adjust package manager command as needed)
cd /home/manuel/workspaces/2026-03-01/add-os-doc-browser/go-go-os-frontend
pnpm --filter @hypercard/apps-browser test
```

## Review Focus For PR

- One doc browser implementation with explicit mode/config.
- Clean command IDs and predictable route parsing.
- No regression in existing app docs flows.
- Top menu contains user-visible Help entry with both actions.

## Suggested Commit Sequence

1. Menu + command contract
2. API/types additions
3. Doc browser mode/config behavior
4. Tests + runtime verification
5. Ticket documentation update
