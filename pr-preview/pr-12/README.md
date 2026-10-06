# DAE26

Mobile-friendly interactive floor plan for the **Dutch Audio Event 2026** (NH Koningshof Veldhoven, 10–11 Oct 2026).

## Goal

A companion web app, hosted as a static site on GitHub Pages, that helps visitors both **prepare** for the event and **find their way** while they are there.

- **Room info at a glance:** tap a room on the floor plan to see a tooltip next to it with its exhibitors and brands, plus a link that opens the room's original page on dutchaudioevent.nl in a new tab.
- **Plan your visit:** search brands, star favorite rooms (their brand shows on the map), and add personal notes.
- **Use it on the day:** works offline on your phone, lets you mark rooms as visited and rate what you heard, and has a low-light theme for dim listening rooms.
- **Keep it simple:** plain HTML, CSS and JS with no build step and no backend. Personal data stays in the browser.

The app for 2026 lives in [`2026/`](2026/) (see its README). The roadmap is in [PLAN.md](PLAN.md).

## Tests

End-to-end tests with [Playwright](https://playwright.dev) in Google Chrome, in [`tests/`](tests/). They serve the repo locally and fake every outside service (Google sign-in and Drive, GoatCounter, fonts), so they run offline.

```sh
npm ci
npm test
```

Each run also measures JS coverage of the app code (`app.js`, `gdrive.js`, `i18n.js`, `legal.js`, `plan.js`, `analytics.js`): a summary is printed at the end, with the full report in `coverage/index.html`. On GitHub the tests run for every push to main and every pull request ([tests.yml](.github/workflows/tests.yml)), and the site and PR previews are only published when they pass. A pull request can't be merged into main until they pass.

After refreshing the event data (see [2026/Sources.md](2026/Sources.md)), run `npm run check-data`. It checks that every room with exhibitors is on the floor plan, that every exhibitor has a page link, and that every HiFi.nl preview belongs to an exhibitor in its room. It's a manual check, not part of `npm test`.
