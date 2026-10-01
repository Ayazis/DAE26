# Data sources

Where the data in `data.js` and `plan.jpg` comes from, and where the raw snapshots are kept.
Snapshots live in [`sourcedata/`](sourcedata/). Refresh them with [`sourcedata/scrape.py`](sourcedata/scrape.py) (see [Refreshing](#refreshing)).

Last scrape: see `sourcedata/scraped.json` (`scraped_at`, plus counts per source).

## Sources

| # | Source | URL | What it gives us | Snapshot |
|---|--------|-----|------------------|----------|
| 1 | Exhibitor index (DAE) | https://dutchaudioevent.nl/exposanten (paged `?letter=A…Z`) | Every exhibitor name and its page URL | `dutchaudioevent.nl/exhibitors.json` |
| 2 | Exhibitor pages (DAE) | `https://dutchaudioevent.nl/<exhibitor>` for example [/dynaudio-benelux](https://dutchaudioevent.nl/dynaudio-benelux) | Room(s) and zone ("Waar te zien?"), address, website and dealer-locator links, the brands shown at DAE, description | `dutchaudioevent.nl/exhibitors.json` |
| 3 | Brand index (DAE) | https://dutchaudioevent.nl/merken (paged `?letter=A…Z, Ø`) | Every brand name and its page URL | `dutchaudioevent.nl/brands.json` |
| 4 | Brand pages (DAE) | `https://dutchaudioevent.nl/<brand>` for example [/aavik](https://dutchaudioevent.nl/aavik) | Product categories (tags such as *versterkers*, *dac*, *audio streamers*), which exhibitor shows it and in which room, website link, description | `dutchaudioevent.nl/brands.json` |
| 5 | Floor plan (DAE) | https://dutchaudioevent.nl/assets/upload/images/dae2026floor.jpg | The official floor plan, 2067×1680. `plan.jpg` is a copy of it | `dutchaudioevent.nl/dae2026floor.jpg` |
| 6 | HiFi.nl preview, A–M | https://hifi.nl/artikel/dutch-audio-event-2026-get-your-tickets | Event facts (hours, prices, shuttle, sponsors) and one paragraph per exhibitor: room, zone and what they will demo, including premières | `hifi.nl/article-p1.html`, `hifi.nl/article.md`, `hifi.nl/exhibitors.json` |
| 7 | HiFi.nl preview, N–Z | https://hifi.nl/artikel/dutch-audio-event-2026-get-your-tickets/2 | Same as 6, for exhibitors N–Z | `hifi.nl/article-p2.html`, `hifi.nl/article.md`, `hifi.nl/exhibitors.json` |

### Known but not scraped

| Source | URL | Why it might be useful |
|--------|-----|------------------------|
| Speakers / talks | https://dutchaudioevent.nl/programma | Talk schedule for the Phase 6 "demo and talk schedule" |
| Shops | https://dutchaudioevent.nl/dealers | Dealers per brand (also linked from the brand pages) |
| News | https://dutchaudioevent.nl/nieuws | Per-exhibitor announcements |
| Show magazine | https://dutchaudioevent.nl/beursmagazine | 180-page printed magazine with floor plans and every exhibitor; print only |
| Tickets | https://dutchaudioevent.nl/tickets | Prices and opening hours (also in the HiFi.nl article) |

## `sourcedata/` layout

```
sourcedata/
  scrape.py                     fetch + parse script (Python 3, standard library only)
  build_hifi.py                 hifi.nl/exhibitors.json -> ../hifi.js, matched to data.js exhibitors and rooms
  scraped.json                  time of the last scrape and item counts
  dutchaudioevent.nl/
    exhibitors.json             sources 1 + 2
    brands.json                 sources 3 + 4
    dae2026floor.jpg            source 5
  hifi.nl/
    article-p1.html             source 6, raw HTML (git-ignored: holds per-visit tokens)
    article-p2.html             source 7, raw HTML (git-ignored: holds per-visit tokens)
    article.md                  both pages as text, one "### Exhibitor | Room | Zone" section each
    exhibitors.json             [{exhibitor, where, page, text}] parsed from the article
    translations-en.json        {heading: {src, en}}: our English translation of each paragraph (src = hash of the Dutch text)
  .cache/                       raw HTML of every fetched page (git-ignored)
```

### `dutchaudioevent.nl/exhibitors.json`

```json
{
 "name": "Reference Sounds",
 "slug": "reference-sounds",
 "url": "https://dutchaudioevent.nl/reference-sounds",
 "locations": [{"room": "42", "zone": "red", "zone_nl": "rode zone"}, {"room": "111", "zone": "red", "zone_nl": "rode zone"}],
 "address": ["Chroomstraat 2", "1362 JK Almere", "Nederland"],
 "links": {"website": "https://www.referencesounds.nl/", "dealer locator": "https://www.referencesounds.nl/dealers/"},
 "brands": [{"name": "Audio Research", "url": "https://dutchaudioevent.nl/audio-research"}],
 "demo_brands": [],
 "dealers": [{"name": "Avnue", "url": "https://dutchaudioevent.nl/avnue", "details": ["Eindhoven", "Nederland"]}],
 "description": "…"
}
```

- `brands`: the "… TOONT OP DUTCH AUDIO EVENT" cards. Only brands that have their own page on the site are listed.
- `demo_brands`: the "DEMONSTRATIE MERKEN" cards (brands used in the demo but not distributed by the exhibitor, for example Network Acoustics at ACM).
- `dealers`: the "… VERKRIJGBAAR BIJ" cards.

### `dutchaudioevent.nl/brands.json`

```json
{
 "name": "Aavik",
 "slug": "aavik",
 "url": "https://dutchaudioevent.nl/aavik",
 "categories": ["versterkers", "dac", "audio streamers"],
 "dae2026": true,
 "shown_by": [{"exhibitor": "Audio Group Denmark", "url": "https://dutchaudioevent.nl/audio-group-denmark",
               "role": "distributeur", "locations": [{"room": "45", "zone": "red", "zone_nl": "rode zone"}]}],
 "links": {"website": "…", "dealer locator": "…"},
 "description": "…"
}
```

## How `data.js` maps to the sources

| `data.js` | Source |
|-----------|--------|
| `EX` (exhibitor → brands) | `exhibitors.json` → `brands[].name` |
| `OCCUPANTS` (room → exhibitors) | `exhibitors.json` → `locations` (cross-checked with the HiFi.nl `where` lines) |
| `URL_EX` (exhibitor → page) | `exhibitors.json` → `url` |
| `BOX` (room hotspots) | Traced by hand from `plan.jpg` (source 5) |
| (not used yet) product categories | `brands.json` → `categories`, for the Phase 3 category filter |
| `HIFI` in `hifi.js` (room preview, searchable) | `hifi.nl/exhibitors.json` + `hifi.nl/translations-en.json`, via `sourcedata/build_hifi.py` |

`data.js` is still edited by hand; the script only refreshes the snapshots. `hifi.js` is generated: run `python 2026/sourcedata/build_hifi.py` after a HiFi.nl refresh or after renaming an exhibitor in `data.js`. It stops when a HiFi.nl heading has no matching exhibitor; add it to `ALIAS` in the script. It also strips page footers the scraper left in a few paragraphs, and warns when a paragraph has no English translation or its Dutch text changed since it was translated; update `translations-en.json` then (until then English mode shows the Dutch text). Diff the JSON after a refresh to see what changed on the site.

### Cross-check of the 28 Sep 2026 scrape against `data.js`

- **Rooms:** every exhibitor's room(s) and zone match. The site spells some rooms differently ("Gallerij" for SPL electronics, "Holland Foyer Headspace", "Groningen foyer" versus HiFi.nl's "Groningenzaal").
- **D&D Audio:** `URL_EX` pointed to `/daudio-exposant` (the *Daudio* page, room 19) instead of https://dutchaudioevent.nl/d-d-audio (room 63). Fixed in `data.js`.
- **STUdo-Hifi** has its own exhibitor page (https://dutchaudioevent.nl/studo-hifi) next to horn-kultur; `data.js` combines them as one entry.
- **Brands:** `EX` lists more brands than the exhibitor pages (for example Reference Sounds, Terrason Audio, Music2). These came from the exhibitor descriptions and brand pages, so the site's `brands` cards are a subset, not a replacement. Spelling differs in places (for example "Inakustik" vs "In-Akustik", "Quad" vs "QUAD").
- **Categories:** all 300 brands have a `DAE 2026` tag, and most have one or more product categories: versterkers (92), Luidsprekers (84), Audio accessoires (40), dac (36), audio streamers (36), kabels (26), platenspelers (24), CD spelers (24), koptelefoons (16), draadloze speakers (15), stroomvoorziening (12), subwoofers (11), portable audio (7), akoestiek (5), Netwerk apparatuur (3), Beeld (3), Sponsors (4). That covers what the Phase 3 category filter needs.
- **HiFi.nl** has 91 exhibitor paragraphs (95 exhibitors on the site). Its room numbers agree with the site. Two small differences: it puts Hi-Stands (Meijerij foyer) in the yellow zone where the site says blue, and gives no zone for Symphonic Line. It also has a "Sound United" paragraph (same room and text as Bowers & Wilkins) that has no page of its own on the site.

## Refreshing

```bash
python 2026/sourcedata/scrape.py
```

- `--only dae`, `--only hifi`, `--only floorplan`: refresh one source (can be repeated).
- `--offline`: re-parse the cached HTML in `.cache/` without network access, for example after fixing a parser.

A full run fetches about 400 pages with a 0.3 s pause between requests and takes a few minutes.
If the sites change their markup, the parsers (regular expressions in `scrape.py`) are the place to fix.

## Notes on copyright

We have permission from the Dutch Audio Event organisation to use the dutchaudioevent.nl content, so those snapshots are committed.

We also have permission from HiFi.nl to use their article text, so its parsed snapshot (`hifi.nl/article.md` and `hifi.nl/exhibitors.json`) is committed too. The English translations in `hifi.nl/translations-en.json` are ours, and the app labels them as translated. The raw HTML pages stay git-ignored because they contain per-visit tokens.
