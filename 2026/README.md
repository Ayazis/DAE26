# Dutch Audio Event 2026 – Floor Map

Interactive floor plan for DAE 2026 (NH Koningshof Veldhoven, 10–11 Oct).
Tap a room to see its exhibitors and brands; search a brand to highlight its room.

Open `index.html` in a browser (no build step).

- `index.html` – page markup
- `styles.css` – styling, light/dark themes
- `app.js` – hotspots, search, zone filter, zoom/pan
- `data.js` – `EX` (exhibitor → brands), `ZONES` (zone → rooms → exhibitors), `BOX` (room → [left, top, width, height] in % of the image)
- `plan.jpg` – floor plan (2067×1680)

Data collected from dutchaudioevent.nl on 26 Sep 2026. To move a hotspot, edit its `BOX` entry.
