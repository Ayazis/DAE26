# Dutch Audio Event 2026 – Floor Map

Interactive floor plan for DAE 2026 (NH Koningshof Veldhoven, 10–11 Oct).
Tap a room to see its exhibitors and brands; search a brand to highlight its room.

Serve the folder over HTTP to test locally (the service worker needs it), for example `python -m http.server` from the repo root and open `/2026/`.

- `index.html` – page markup
- `styles.css` – styling, light/dark themes
- `app.js` – SVG map build, pan/zoom, tooltip, search and filters, favorites, notes, visited/ratings, share and export
- `plan.js` – schematic floor plan geometry (building, patios, corridors, icons, entrances), traced from `plan.jpg`
- `data.js` – `EX` (exhibitor → brands), `ZONES` (zone → rooms → exhibitors), `BOX` (room → [left, top, width, height] in % of the image), `URL_EX` (exhibitor → page on dutchaudioevent.nl)
- `plan.jpg` – original floor plan (2067×1680), shown with the "Original" toggle
- `sw.js`, `manifest.webmanifest`, `icon-*.png` – offline support and install

User data (favorites, notes, visited, ratings, settings) is stored in `localStorage` under `daem-2026-v1`.

Data collected from dutchaudioevent.nl on 26 Sep 2026. To move a room, edit its `BOX` entry. To change the building outline or icons, edit `plan.js` (units: `plan.jpg` scaled to 2000 px wide).
