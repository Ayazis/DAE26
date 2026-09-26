# Phased plan

Event dates: **10–11 Oct 2026**. Aim to have Phase 4 (offline support) live and tested on a phone at least a week before the event.

Some of this already exists in `2026/` (search, zone filter, zoom/pan, light/dark themes). Phase 0 checks what works and fills the gaps.

## Phase 0: Foundation
- [x] Review the existing code and data. Already working: room hotspots (`BOX`), a room info panel below the map, search that highlights matching rooms, zone filter, 1×/2×/3× zoom with drag-to-pan, light/dark themes, and "also in room X" links for exhibitors in several rooms.
- [x] Enable GitHub Pages from `main` (the app is at `/DAE26/2026/`). A root `index.html` redirects to `2026/`.
- [x] Data model: `URL_EX` in `data.js` maps all 94 exhibitors to their page on dutchaudioevent.nl. The room panel shows a "View page ↗" link for each one (new tab). Categories are postponed to Phase 3.
- [x] All user data is stored under one versioned `localStorage` key, `daem-2026-v1`, through a small `store` helper in `app.js`. The old `dae-zoom` key is migrated automatically.

## Phase 1: Core map (MVP) — SVG floor plan
- [x] Redraw `plan.jpg` as an inline SVG (`plan.js` geometry + `BOX` rooms): building, patios, zone-coloured corridors, labelled rooms, facility icons (toilets, info, catering, wardrobe, first aid), entrances and zone badges.
- [x] Themed: follows light/dark mode. "Map" toggles the drawn map, "Original" toggles `plan.jpg`. Use either or both.
- [x] Pan and zoom by changing the SVG viewBox: drag, pinch, mouse wheel, and −/Fit/+ buttons.
- [x] Tapping a room shows a tooltip next to it with exhibitors, brands and "View page ↗" links (new tab). On phones it becomes a bottom sheet. Closes with ×, Esc, or a tap on empty map.
- [x] Rooms can be reached with the keyboard (Tab, Enter).
- **Done when:** every room can be clicked on desktop and phone, and every link works.

## Phase 2: Personalisation
- [x] Star a room from its tooltip; starred rooms get a gold star and their headline brand (for example "Aavik +3") on the map.
- [x] Favorites list below the map, sorted by zone and room; tapping an entry zooms to that room and opens its tooltip.
- [x] Personal notes per room (in the tooltip, shown in the favorites list).
- **Done when:** favorites and notes survive a page reload.

## Phase 3: Find things
- [x] Search highlights all matching rooms and shows the result count. It also searches your own notes.
- [x] Filter chips: zones, "★ Favorites only" and "Hide visited".
- [x] Zone chips toggle (more than one can be active). Only the active zones stay visible, and the view zooms to them. The original image is cropped to them.
- [ ] Category filter chips (speakers, headphones, analog, electronics…). Needs a category for each exhibitor or brand, which the event site doesn't provide. Still to do.
- [x] Floor switcher: not needed, the event is on one floor.

## Phase 4: At-the-event mode
- [x] Installable PWA that works offline: `manifest.webmanifest`, app icons, and `sw.js` (caches the app on first visit, refreshes it in the background). Bump `CACHE` in `sw.js` when you want everyone to get a new version immediately.
- [x] "Visited" toggle in the tooltip: visited rooms turn grey with a green ✓, and a progress bar shows favorites and rooms visited.
- [x] Quick 1–5 star rating per room.
- [x] Theme button (Auto / Dark / Light); dark is the low-light mode.
- [x] Toilets, info points, catering, wardrobe, first aid and entrances are on the map (done in Phase 1).
- [ ] **Still to do:** check airplane mode on a real phone after the first visit.

## Phase 5: Share and export
- [x] "Share favorites" makes a `#fav=45,32,…` link (native share sheet on phones, clipboard on desktop). Opening it asks before adding the favorites.
- [x] Backup and restore as JSON.
- [x] Export notes, ratings and visited status as Markdown or CSV.

## Phase 6: Nice-to-haves
- [ ] Demo and talk schedule with reminders.
- [ ] "Next nearest favorite" suggestion.
- [ ] Make the data reusable so the same code can run the 2027 edition.
