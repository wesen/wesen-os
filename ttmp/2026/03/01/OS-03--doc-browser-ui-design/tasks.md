# Tasks

## Screen 1: Doc Center Home (verify in Storybook before moving on)

- [x] 1.1 Add /api/os/docs MSW handler to createAppsHandlers
- [x] 1.2 Expand mock fixtures: add arc-agi module + richer doc corpus (3 modules, ~11 docs)
- [x] 1.3 Create DocBrowserWindow shell component + CSS (toolbar, layout container)
- [x] 1.4 Create DocBrowserContext for internal screen navigation
- [x] 1.5 Create DocCenterHome component (module cards, topic chips, doc type chips, search bar)
- [x] 1.6 Create DocCenterHome.stories.tsx with Default, Empty, Loading, ManyModules variants
- [ ] 1.7 Verify Screen 1 renders correctly in Storybook

## Screen 2: Doc Reader (verify in Storybook before moving on)

- [ ] 2.1 Add react-markdown + remark-gfm + rehype-highlight dependencies
- [ ] 2.2 Create MarkdownRenderer component
- [ ] 2.3 Create DocReaderScreen component (breadcrumb, metadata bar, rendered content, see-also, prev/next)
- [ ] 2.4 Create DocReaderScreen.stories.tsx with various doc content variants
- [ ] 2.5 Wire DocCenterHome module card / doc title clicks to navigate to reader
- [ ] 2.6 Verify Screen 2 renders correctly in Storybook

## Screen 3: Search & Filter (verify in Storybook before moving on)

- [ ] 3.1 Create DocFilterSidebar component (module/doc-type/topic checkboxes with counts)
- [ ] 3.2 Create DocSearchScreen component (search bar + filter sidebar + result cards)
- [ ] 3.3 Create DocSearchScreen.stories.tsx with Default, PreFiltered, NoResults variants
- [ ] 3.4 Wire search bar and topic/type chip clicks to navigate to search screen
- [ ] 3.5 Verify Screen 3 renders correctly in Storybook

## Screen 4: Module Docs (verify in Storybook before moving on)

- [ ] 4.1 Create ModuleDocsScreen component (module header, docs grouped by type, read buttons)
- [ ] 4.2 Create ModuleDocsScreen.stories.tsx with Inventory, ArcAgi, Gepa, NoDocs variants
- [ ] 4.3 Wire module card header clicks and breadcrumb links to module docs screen
- [ ] 4.4 Verify Screen 4 renders correctly in Storybook

## Screen 5: Topic Browser (verify in Storybook before moving on)

- [ ] 5.1 Create TopicBrowserScreen component (two-pane: topic list + topic detail)
- [ ] 5.2 Create TopicBrowserScreen.stories.tsx with Default, SelectedTopic variants
- [ ] 5.3 Wire topic chip clicks from home screen to topic browser
- [ ] 5.4 Verify Screen 5 renders correctly in Storybook

## Integration

- [ ] 6.1 Register desktop commands (docs.open-center, docs.open-page, docs.search)
- [ ] 6.2 Update GetInfoWindow doc links to open in Doc Reader instead of raw JSON
- [ ] 6.3 Add "View Documentation" context menu entry to AppsFolderWindow
- [ ] 6.4 Add docs entry point to ModuleBrowserWindow
