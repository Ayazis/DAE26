#!/usr/bin/env python3
"""Build ../hifi.js from the HiFi.nl snapshot (hifi.nl/exhibitors.json) and its English translation
(hifi.nl/translations-en.json).

Each HiFi.nl paragraph is matched to the exhibitor names used in data.js (EX keys) and to the
rooms those exhibitors have in data.js (ZONES). Run it after a scrape or after renaming an
exhibitor in data.js:

    python 2026/sourcedata/build_hifi.py

It stops with an error when a paragraph can't be matched; add the name to ALIAS then.
It warns when a paragraph has no English translation, or when HiFi.nl changed the Dutch text since
it was translated (the "src" hash no longer matches): update translations-en.json then. Without a
current translation the app shows the Dutch text in English mode too.
Python 3, standard library only.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = HERE.parent
PAGES = {
    1: "https://hifi.nl/artikel/dutch-audio-event-2026-op-10-en-11-oktober-groter-dan-ooit",
    2: "https://hifi.nl/artikel/dutch-audio-event-2026-op-10-en-11-oktober-groter-dan-ooit/2",
}

# HiFi.nl heading -> EX keys in data.js, where the plain name doesn't match.
# A heading that names several exhibitors sharing a room lists them all.
ALIAS = {
    "AF Group": ["AF Group SRL"],
    "Driade": ["Driade Systems"],
    "Hear Everything Audio Import & Tonality Import": ["Hear Everything Audio Import", "Tonality Import"],
    "Helios & Audio Essence": ["Helios Pro Audio Solutions", "Audio Essence"],
    "IsoAcoustics Nederland": ["IsoAcoustics"],
    "Joep Slooten": ["Joep Slooten speakers & meubels"],
    "SPL Electronics & Manger Audio": ["SPL electronics", "Manger Audio"],
    "STS Digital": ["STS Analog / STS Digital"],
    "STUdo-Hifi & Horn-Kultur": ["horn-kultur / STUdo-Hifi"],
    "Temporal Coherence & Hepta Design Audio": ["Temporal Coherence", "Hepta Design Audio"],
    "VoiceVictory & Hifi Fusion": ["VoiceVictory", "Hifi Fusion"],
}
# Same room and text as another paragraph and no exhibitor of its own in data.js.
SKIP = {"Sound United"}  # = Bowers & Wilkins
# Page furniture the scraper left in a paragraph: the zone line of a heading without one, and the
# article's footer after the last paragraph of each page.
LEAD_JUNK = re.compile(r"^(Rode|Blauwe|Groene|Gele) zone\n")
TAIL_JUNK = re.compile(r"\n\n(Wordt vervolgd op pagina|Wil je niets missen van Dutch Audio Event).*", re.S)
# Typos in the article: heading -> [(wrong, right)].
FIX = {"ERCT": [("In kamer 15 ", "In kamer 115 ")]}


def clean(h, text):
    text = TAIL_JUNK.sub("", LEAD_JUNK.sub("", text)).strip()
    for wrong, right in FIX.get(h, []):
        text = text.replace(wrong, right)
    return text


def src_hash(text):
    """Short hash of the Dutch text a translation was made from."""
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def load_data_js():
    src = (APP / "data.js").read_text(encoding="utf-8")
    ex_block, zones_block = src.split("const ZONES", 1)
    ex = re.findall(r'^"([^"]+)":\[', ex_block, re.M)
    zones_block = zones_block.split("const BOX", 1)[0]
    where = {}
    for room, exs in re.findall(r'\["([^"]+)",\[([^\]]*)\]\]', zones_block):
        for e in re.findall(r'"([^"]+)"', exs):
            where.setdefault(e, []).append(room)
    return ex, where


def mentions(room, text):
    """Does HiFi.nl's location line (e.g. 'Kamer 83 & Utrecht Foyer | Groene zone') name this room?"""
    text = text.lower()
    if room.isdigit():
        return re.search(r"(?<!\d)" + room + r"(?!\d)", text) is not None
    word = re.sub(r" foyer.*| \(.*", "", room.lower())  # 'Holland foyer (Headspace)' -> 'holland'
    return word in text


def main():
    ex, where = load_data_js()
    by_norm = {norm(e): e for e in ex}
    en = json.loads((HERE / "hifi.nl" / "translations-en.json").read_text(encoding="utf-8"))
    out, errors, warnings = [], [], []
    for x in json.loads((HERE / "hifi.nl" / "exhibitors.json").read_text(encoding="utf-8")):
        h = x["exhibitor"]
        if h in SKIP:
            continue
        keys = ALIAS.get(h) or ([by_norm[norm(h)]] if norm(h) in by_norm else None)
        if not keys or any(k not in where for k in keys):
            errors.append(f"{h!r}: no matching exhibitor in data.js (add it to ALIAS)")
            continue
        rooms = list(dict.fromkeys(r for k in keys for r in where[k]))
        # An exhibitor with several rooms can have a paragraph per room (SPL: Galerij and room 24).
        named = [r for r in rooms if mentions(r, x["where"])]
        text = clean(h, x["text"])
        o = {"h": h, "ex": keys, "rooms": named or rooms, "p": x["page"], "text": text}
        t = en.get(h)
        if not t:
            warnings.append(f"{h!r}: no English translation")
        elif t["src"] != src_hash(text):
            warnings.append(f"{h!r}: Dutch text changed since it was translated (src {t['src']} -> {src_hash(text)})")
        else:
            o["en"] = t["en"]
        out.append(o)
    if errors:
        sys.exit("\n".join(errors))
    for w in warnings:
        print("warning:", w, file=sys.stderr)

    lines = [
        "// Generated by sourcedata/build_hifi.py from sourcedata/hifi.nl/exhibitors.json; edit those, not this file.",
        "// HiFi.nl preview of DAE 2026 (Dutch, used with permission): one paragraph per exhibitor, or per room",
        "// when exhibitors share one. h = HiFi.nl heading, ex = EX keys, rooms = ZONES rooms, p = page in HIFI_URL,",
        "// text = HiFi.nl's Dutch text, en = our English translation of it.",
        "const HIFI_URL = " + json.dumps(PAGES, ensure_ascii=False) + ";",
        "const HIFI = [",
        ",\n".join(json.dumps(o, ensure_ascii=False) for o in out),
        "];",
        "",
    ]
    (APP / "hifi.js").write_text("\n".join(lines), encoding="utf-8")
    print(f"hifi.js: {len(out)} paragraphs, {sum('en' in o for o in out)} translated")


if __name__ == "__main__":
    main()
