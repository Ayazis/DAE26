"""Fetch the Dutch Audio Event 2026 source data into this folder.

Usage (from anywhere, Python 3.8+, standard library only):
    python scrape.py              # fetch everything and rewrite the JSON/Markdown snapshots
    python scrape.py --offline    # re-parse the cached HTML in .cache/ without network access
    python scrape.py --only hifi  # one source: dae | hifi | floorplan

See ../Sources.md for what each source contains and how it maps to data.js.
"""
import argparse
import datetime
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE / ".cache"
DAE = "https://dutchaudioevent.nl"
HIFI_ARTICLE = "https://hifi.nl/artikel/dutch-audio-event-2026-op-10-en-11-oktober-groter-dan-ooit"
FLOORPLAN = DAE + "/assets/upload/images/dae2026floor.jpg"
UA = "Mozilla/5.0 (DAE26 floor map data refresh)"
DELAY = 0.3  # seconds between network requests, to be polite

OFFLINE = False


def fetch(url, binary=False):
    """GET a URL, caching the body under .cache/ so --offline can re-parse it later."""
    key = re.sub(r"[^A-Za-z0-9._-]+", "_", url.split("://", 1)[1]).strip("_")[:180]
    path = CACHE / key
    if OFFLINE:
        if not path.exists():
            raise SystemExit(f"--offline: {url} is not cached")
        data = path.read_bytes()
    else:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    data = r.read()
                break
            except Exception as e:  # noqa: BLE001 - retry any network error
                if attempt == 2:
                    raise
                print(f"  retry {url}: {e}", file=sys.stderr)
                time.sleep(2)
        CACHE.mkdir(exist_ok=True)
        path.write_bytes(data)
        time.sleep(DELAY)
    return data if binary else data.decode("utf-8", "replace")


def text(fragment):
    """HTML fragment -> plain text with single spaces."""
    fragment = re.sub(r"<br\s*/?>", "\n", fragment)
    t = html.unescape(re.sub(r"<[^>]+>", "", fragment))
    t = re.sub(r"[ \t\r\f\v\xa0]+", " ", t)
    return "\n".join(l.strip() for l in t.split("\n") if l.strip())


def meta(page, prop):
    m = re.search(r'<meta property="%s" content="([^"]*)"' % re.escape(prop), page)
    return html.unescape(m.group(1)).replace("\r\n", "\n").strip() if m else ""


def slug_of(url):
    return urllib.parse.unquote(url.rstrip("/").rsplit("/", 1)[-1])


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(HERE)}")


# ---------------------------------------------------------------- dutchaudioevent.nl

# A card is an <a href="https://dutchaudioevent.nl/..."> followed (before the next <a>) by <div class="h2 ...">Name</div>.
CARD_RE = re.compile(r'<a\b[^>]*href="(https://dutchaudioevent\.nl/[^"]+)"[^>]*>(?:(?!<a\b).)*?<div class="h2\b[^"]*">(.*?)</div>', re.S)


def cards(fragment):
    out = {}
    for url, name in CARD_RE.findall(fragment):
        # Dealer cards split the title into <span>Name</span><span>City</span><span>Country</span>
        parts = [text(p) for p in re.findall(r"<span>(.*?)</span>", name, re.S)] or [text(name)]
        card = {"name": parts[0], "url": url}
        if len(parts) > 1:
            card["details"] = parts[1:]
        out.setdefault(url, card)
    return list(out.values())


def listing(section):
    """All entries of /exposanten or /merken, which are paged by first letter."""
    first = fetch(f"{DAE}/{section}")
    letters = []
    for l in re.findall(r'href="\?letter=([^"]+)"', first):
        if l not in letters:
            letters.append(l)
    entries = {}
    for l in letters:
        page = fetch(f"{DAE}/{section}?letter={urllib.parse.quote(l)}")
        for c in cards(page):
            entries.setdefault(c["url"], c["name"])
    print(f"{section}: {len(letters)} letter pages, {len(entries)} entries")
    return [{"name": n, "slug": slug_of(u), "url": u} for u, n in entries.items()]


LOC_RE = re.compile(r'([^|<>]+?)\s*\|\s*<a[^>]*>\s*<span class="zone-(\w+)">([^<]+)</span>')


def locations(fragment):
    return [{"room": text(r).removeprefix("Kamer ").strip(), "zone": z, "zone_nl": text(zn)}
            for r, z, zn in LOC_RE.findall(fragment)]


def header_block(page):
    """The 'Waar te zien?' header block up to the logo column."""
    i = page.find("Waar te zien?")
    if i < 0:
        return ""
    j = page.find("image-border", i)
    return page[i:j if j > 0 else i + 6000]


def links(block):
    out = {}
    for url, label in re.findall(r'<a href="(https?://[^"]+)"[^>]*><u>([^<]+)</u></a>', block):
        out[text(label)] = url
    return out


def cards_after(page, heading_re):
    """Name/URL cards in the section whose <h2> matches heading_re."""
    m = re.search(heading_re, page)
    if not m:
        return []
    rest = page[m.end():]
    nxt = re.search(r'<h2 class="front-h2">', rest)
    rest = rest[:nxt.start()] if nxt else rest
    return cards(rest)


def exhibitor(entry):
    page = fetch(entry["url"])
    block = header_block(page)
    addr = re.search(r"<b>Deelnemer gegevens</b>(.*?)</p>", block, re.S)
    return {
        **entry,
        "locations": locations(block),
        "address": [l for l in text(addr.group(1)).split("\n") if l.strip()] if addr else [],
        "links": links(block),
        "brands": cards_after(page, r'<h2 class="front-h2">[^<]*TOONT OP DUTCH AUDIO EVENT'),
        "demo_brands": cards_after(page, r'<h2 class="front-h2">\s*DEMONSTRATIE MERKEN'),
        "dealers": cards_after(page, r'<h2 class="front-h2">[^<]*VERKRIJGBAAR BIJ'),
        "description": meta(page, "og:description"),
    }


def brand(entry):
    page = fetch(entry["url"])
    head = re.search(r'<div class="header">(.*?)</div>', page, re.S)
    tags = [text(t) for t in re.findall(r'<span class="tag">(.*?)</span>', head.group(1), re.S)] if head else []
    block = header_block(page)
    # Distributor lines: <a href="/slug"><u><b>Name</b></u></a> - (role)<br> Kamer X | zone ...
    shown_by = []
    parts = re.split(r'(?=<a href="/[^"]+"><u><b>)', block)
    for part in parts[1:]:
        m = re.match(r'<a href="/([^"]+)"><u><b>(.*?)</b></u></a>\s*(?:&nbsp;)?\s*-?\s*(?:&nbsp;)?\s*\(([^)]*)\)?', part)
        if m:
            shown_by.append({"exhibitor": text(m.group(2)), "url": f"{DAE}/{m.group(1)}",
                             "role": text(m.group(3)), "locations": locations(part)})
    return {
        **entry,
        "categories": [t for t in tags if t and t != "DAE 2026"],
        "dae2026": "DAE 2026" in tags,
        "shown_by": shown_by,
        "links": links(block),
        "description": meta(page, "og:description"),
    }


def scrape_dae():
    out = HERE / "dutchaudioevent.nl"
    exhibitors = listing("exposanten")
    brands = listing("merken")
    ex = []
    for i, e in enumerate(exhibitors, 1):
        print(f"  exhibitor {i}/{len(exhibitors)} {e['slug']}")
        ex.append(exhibitor(e))
    br = []
    for i, b in enumerate(brands, 1):
        print(f"  brand {i}/{len(brands)} {b['slug']}")
        br.append(brand(b))
    write_json(out / "exhibitors.json", ex)
    write_json(out / "brands.json", br)
    return {"exhibitors": len(ex), "brands": len(br)}


# ---------------------------------------------------------------- hifi.nl

def scrape_hifi():
    out = HERE / "hifi.nl"
    out.mkdir(exist_ok=True)
    entries, md = [], []
    for n, url in enumerate([HIFI_ARTICLE, HIFI_ARTICLE + "/2"], 1):
        page = fetch(url)
        (out / f"article-p{n}.html").write_text(page, encoding="utf-8")
        body = page[page.find("<article"):page.rfind("</article>")]
        md.append(f"<!-- page {n}: {url} -->\n")
        current = None
        for p in re.findall(r"<p\b[^>]*>(.*?)</p>", body, re.S):
            # Exhibitor paragraphs start with <strong>Name | Location(s) | Zone</strong>
            h = re.match(r"\s*<strong>([^<]*\|[^<]*)</strong>\s*(?:<br\s*/?>)?(.*)", p, re.S)
            if h:
                head = text(h.group(1))
                name, _, where = head.partition("|")
                current = {"exhibitor": name.strip(), "where": where.strip(), "page": n, "text": text(h.group(2))}
                entries.append(current)
                md.append(f"\n### {head}\n\n{current['text']}\n")
                continue
            t = text(p)
            if not t:
                continue
            if current:
                current["text"] = (current["text"] + "\n\n" + t).strip()
            md.append(f"\n{t}\n")
    write_json(out / "exhibitors.json", entries)
    (out / "article.md").write_text("".join(md), encoding="utf-8")
    print("wrote hifi.nl/article.md")
    return {"hifi_entries": len(entries)}


# ---------------------------------------------------------------- floor plan

def scrape_floorplan():
    data = fetch(FLOORPLAN, binary=True)
    path = HERE / "dutchaudioevent.nl" / "dae2026floor.jpg"
    path.parent.mkdir(exist_ok=True)
    path.write_bytes(data)
    print(f"wrote {path.relative_to(HERE)} ({len(data)} bytes)")
    return {"floorplan_bytes": len(data)}


def main():
    global OFFLINE
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--offline", action="store_true", help="parse .cache/ only, no network")
    ap.add_argument("--only", choices=["dae", "hifi", "floorplan"], action="append")
    args = ap.parse_args()
    OFFLINE = args.offline
    jobs = {"dae": scrape_dae, "hifi": scrape_hifi, "floorplan": scrape_floorplan}
    counts = {}
    for name in args.only or jobs:
        counts.update(jobs[name]())
    stamp = HERE / "scraped.json"
    prev = json.loads(stamp.read_text(encoding="utf-8")) if stamp.exists() else {}
    if not OFFLINE:  # an offline re-parse keeps the time of the last real fetch
        prev["scraped_at"] = datetime.datetime.now().astimezone().isoformat(timespec="seconds")
    prev.update(counts)
    write_json(stamp, prev)


if __name__ == "__main__":
    main()
