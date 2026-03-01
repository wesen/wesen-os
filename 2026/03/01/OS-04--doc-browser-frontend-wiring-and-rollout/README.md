# Doc Browser Frontend Wiring and Rollout

This is the document workspace for ticket OS-04.

## Structure

- **design/**: Design documents and architecture notes
- **reference/**: Reference documentation and API contracts
- **playbooks/**: Operational playbooks and procedures
- **scripts/**: Utility scripts and automation
- **sources/**: External sources and imported documents
- **various/**: Scratch or meeting notes, working notes
- **archive/**: Optional space for deprecated or reference-only artifacts

## Getting Started

Use docmgr commands to manage this workspace:

- Add documents: `docmgr doc add --ticket OS-04 --doc-type design-doc --title "My Design"`
- Import sources: `docmgr import file --ticket OS-04 --file /path/to/doc.md`
- Update metadata: `docmgr meta update --ticket OS-04 --field Status --value review`
