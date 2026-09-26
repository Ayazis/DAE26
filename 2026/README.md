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

## Optional Google Drive backup (feature flag)

Off by default; the app is fully usable without it and local JSON backup/restore is unaffected.

1. In Google Cloud Console create a project, configure the OAuth consent screen, and create an OAuth client ID of type *Web application*. Add your hosting origin (and `http://localhost:PORT` for testing) under *Authorised JavaScript origins*.
2. Enable the *Google Drive API* and use only the `drive.appdata` scope (non-sensitive, so no Google verification review).
3. In `app.js` set `FEATURES.cloudBackup = true` and `GDRIVE_CLIENT_ID = "<your client id>"`.

Adds three buttons under *Share & backup*: back up, restore, disconnect. The backup is one file in the app's hidden Drive folder. Google's script is only fetched when a button is first clicked. Sync is manual: browser-only sign-in tokens last about an hour and can't refresh silently.
