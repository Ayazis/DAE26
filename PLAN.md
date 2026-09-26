# Phased plan

Event dates: **10–11 Oct 2026**. Aim to have Phase 4 (offline support) live and tested on a phone at least a week before the event.

Some of this already exists in `2026/` (search, zone filter, zoom/pan, light/dark themes). Phase 0 checks what works and fills the gaps.

## Phase 0: Foundation
- [x] Review the existing code and data. Already working: room hotspots (`BOX`), a room info panel below the map, search that highlights matching rooms, zone filter, 1×/2×/3× zoom with drag-to-pan, light/dark themes, and "also in room X" links for exhibitors in several rooms.
- [x] Enable GitHub Pages from `main` (the app is at `/DAE26/2026/`). A root `index.html` redirects to `2026/`.
- [x] Data model: `URL_EX` in `data.js` maps all 94 exhibitors to their page on dutchaudioevent.nl. The room panel shows a "View page ↗" link for each one (new tab). Categories are postponed to Phase 3.
- [x] All user data is stored under one versioned `localStorage` key, `daem-2026-v1`, through a small `store` helper in `app.js`. The old `dae-zoom` key is migrated automatically.

## Phase 1: Core map (MVP)
- [ ] Tapping or clicking a room shows a tooltip next to it with the room name, exhibitors, brands, and a "View page ↗" link (`target="_blank" rel="noopener"`).
- [ ] Keep the tooltip on screen at the edges, close it on an outside tap or Esc, and make it keyboard-accessible.
- [ ] Make sure pinch zoom and pan work well on mobile.
- **Done when:** every room can be clicked on desktop and phone, and every link works.

## Phase 2: Personalisation
- [ ] Star a room from its tooltip; starred rooms get a star marker and their brand label on the map.
- [ ] Favorites panel sorted by zone and room; tapping an entry jumps to that room on the map.
- [ ] Personal notes per room.
- **Done when:** favorites and notes survive a page reload.

## Phase 3: Find things
- [ ] Improve search: highlight all matching rooms and show the result count.
- [ ] Category filter chips (speakers, headphones, analog, electronics…).
- [ ] Zone and floor switcher refinements.

## Phase 4: At-the-event mode
- [ ] Make it an installable PWA that works offline (manifest plus a service worker that caches the app, data and `plan.jpg`).
- [ ] "Visited" toggle, visited rooms greyed out, and a progress counter.
- [ ] Quick 1–5 rating per room.
- [ ] Low-light theme tuning.
- [ ] Practical points of interest: toilets, food, exits, cloakroom.
- **Done when:** the app works in airplane mode on a phone after the first visit.

## Phase 5: Share and export
- [ ] Share favorites through a URL hash, with import on open.
- [ ] Export and import JSON as a backup.
- [ ] Export notes and ratings as Markdown or CSV for after the event.

## Phase 6: Nice-to-haves
- [ ] Demo and talk schedule with reminders.
- [ ] "Next nearest favorite" suggestion.
- [ ] Make the data reusable so the same code can run the 2027 edition.
