# Tasks

## Screen 1: Doc Center Home (verify in Storybook before moving on)

- [x] 1.1 Add /api/os/docs MSW handler to createAppsHandlers
- [x] 1.2 Expand mock fixtures: add arc-agi module + richer doc corpus (3 modules, ~11 docs)
- [x] 1.3 Create DocBrowserWindow shell component + CSS (toolbar, layout container)
- [x] 1.4 Create DocBrowserContext for internal screen navigation
- [x] 1.5 Create DocCenterHome component (module cards, topic chips, doc type chips, search bar)
- [x] 1.6 Create DocCenterHome.stories.tsx with Default, Empty, Loading, ManyModules variants
- [x] 1.7 Verify Screen 1 renders correctly in Storybook (build passes)

## Screen 2: Doc Reader (verify in Storybook before moving on)

- [x] 2.1 Add react-markdown + remark-gfm dependencies (via pnpm)
- [x] 2.2 Create MarkdownRenderer (inline in DocReaderScreen using react-markdown)
- [x] 2.3 Create DocReaderScreen component (breadcrumb, metadata bar, rendered content, see-also, prev/next)
- [x] 2.4 Create DocReaderScreen stories (API ref, see-also, troubleshooting, session lifecycle, not-found)
- [x] 2.5 Wire DocCenterHome module card / doc title clicks to navigate to reader
- [x] 2.6 Verify Screen 2 renders correctly in Storybook (build passes)

## Screen 3: Search & Filter (verify in Storybook before moving on)

- [x] 3.1 Create DocFilterSidebar component (inline in DocSearchScreen: module/doc-type/topic checkboxes)
- [x] 3.2 Create DocSearchScreen component (search bar + filter sidebar + result cards)
- [x] 3.3 Wire search screen into DocBrowserWindow router
- [x] 3.4 Wire search bar and topic/type chip clicks to navigate to search screen
- [x] 3.5 Verify Screen 3 renders correctly in Storybook (build passes)

## Screen 4: Module Docs (verify in Storybook before moving on)

- [x] 4.1 Create ModuleDocsScreen component (module header, docs grouped by type, entry cards)
- [x] 4.2 Create ModuleDocsScreen.stories.tsx with Inventory, ArcAgi, Gepa variants
- [x] 4.3 Wire module-docs screen into DocBrowserWindow router (replaced PlaceholderScreen)
- [x] 4.4 Verify Screen 4 renders correctly in Storybook (build passes)

## Screen 5: Topic Browser (verify in Storybook before moving on)

- [x] 5.1 Create TopicBrowserScreen component (two-pane: topic list + topic detail grouped by module)
- [x] 5.2 Create TopicBrowserScreen.stories.tsx with NoTopicSelected, PreSelectedTopic variants
- [x] 5.3 Wire topic-browser screen into DocBrowserWindow router + Topics toolbar button
- [x] 5.4 Verify Screen 5 renders correctly in Storybook (build passes)

## Integration

- [x] 6.1 Register desktop commands (open-docs, open-doc-page, search-docs) with window adapter + command handler
- [x] 6.2 Update GetInfoWindow doc links to open in Doc Reader via onOpenDoc callback
- [x] 6.3 Add "View Documentation" context menu entry to AppsFolderWindow
- [x] 6.4 Add "View Documentation" context menu entry to ModuleBrowserWindow
