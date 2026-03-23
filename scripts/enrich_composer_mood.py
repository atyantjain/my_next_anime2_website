"""
Enrich anime_complete.csv with:
  1. Composer — from Jikan /anime/{id}/staff (role: "Music")
  2. Mood    — synthesized from AniList top-rated English review summaries
               (stored as "AniList review synthesis" in mood_method)

Only rows with missing composer or non-IMDb mood are processed.
Already-enriched rows are untouched.

Rate limits:
  Jikan: ~3 req/s  →  0.4s sleep between calls
  AniList: 90 req/min → 0.7s sleep between calls
"""

import csv
import re
import time
import requests

CSV_PATH = "public/anime_complete.csv"
ANILIST_URL = "https://graphql.anilist.co"

# ─── helpers ─────────────────────────────────────────────────────────────────

def jikan_get(path: str, retries: int = 3) -> dict:
    url = f"https://api.jikan.moe/v4{path}"
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=20)
            if r.status_code == 429:
                wait = 4 + attempt * 2
                print(f"    [rate-limit] sleeping {wait}s …")
                time.sleep(wait)
                continue
            if r.status_code == 404:
                return {}
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            print(f"    [jikan error] {exc}")
            time.sleep(3)
    return {}


def anilist_query(mal_id: str) -> dict:
    """Fetch reviews and tags for a given MAL ID via AniList GraphQL."""
    gql = """
    query($malId: Int) {
      Media(idMal: $malId, type: ANIME) {
        reviews(limit: 10, sort: RATING_DESC) {
          nodes { summary score }
        }
        tags { name rank }
      }
    }
    """
    try:
        r = requests.post(
            ANILIST_URL,
            json={"query": gql, "variables": {"malId": int(mal_id)}},
            timeout=20,
        )
        if r.status_code == 429:
            print("    [AniList rate-limit] sleeping 10s …")
            time.sleep(10)
            return {}
        if not r.ok:
            return {}
        data = r.json().get("data", {}).get("Media") or {}
        return data
    except Exception as exc:
        print(f"    [anilist error] {exc}")
        return {}


LANG_GARBAGE = re.compile(
    r"[\u0080-\u024F]{4,}"   # long runs of non-ASCII latin-ext (Portuguese/French etc.)
    r"|[\u3000-\u9FFF]",     # CJK
    re.UNICODE,
)

def is_english(text: str) -> bool:
    """Rough English-language filter."""
    non_ascii = len(re.findall(r"[^\x00-\x7F]", text))
    return non_ascii / max(len(text), 1) < 0.08 and not LANG_GARBAGE.search(text)


MOOD_ADJ = re.compile(
    r"\b("
    r"amaz\w+|beautif\w+|brilliant|breath\w+|capti\w+|charming|classic|compelling|"
    r"dark|depress\w+|disturb\w+|dramatic|emotion\w+|epic|excellent|excit\w+|"
    r"fantasy|fun\w*|genuin\w+|grip\w+|haunt\w+|heartbreak\w+|heartwarming|"
    r"heav\w+|hopeful|humor\w+|impact\w+|inspir\w+|intens\w+|interesting|"
    r"masterpiece|melanchol\w+|memorabl\w+|moving|nostalgic|originalg\w*|outstanding|"
    r"painful|perfect|poignant|powerful|profound\w+|relatable|rewarding|"
    r"romant\w+|sad|smart|slow.burn|stunning|suspense\w*|tear\w+|tender|"
    r"thought.provok\w+|thrilling|touch\w+|tragedic|tragic|unique|unforgettabl\w+|"
    r"uplift\w+|visceral|vivid|wholesom\w+|wonder\w+"
    r")\b",
    re.IGNORECASE,
)


def synthesize_mood(reviews: list[dict], tags: list[dict]) -> str:
    """
    Build a 1–2 sentence mood string from AniList review summaries.
    Falls back to tag-based description if no usable reviews.
    """
    # Filter: English, score >= 75, non-empty
    good = [
        rv for rv in reviews
        if rv.get("score", 0) >= 75
        and rv.get("summary")
        and is_english(rv["summary"])
    ]
    # Sort by score desc
    good.sort(key=lambda x: x["score"], reverse=True)
    summaries = [rv["summary"].strip().rstrip(".") for rv in good[:6]]

    if summaries:
        # Collect unique adjectives/mood words from summaries
        all_text = " ".join(summaries).lower()
        found_adj = list(dict.fromkeys(MOOD_ADJ.findall(all_text)))[:6]

        # Pick the best summary as the lead sentence
        lead = summaries[0]
        if len(lead) > 160:
            lead = lead[:157] + "…"

        mood_parts = []
        if found_adj:
            mood_parts.append(", ".join(found_adj[:4]).capitalize())
        mood_parts.append(f"— viewers describe it as {lead[0].lower()}{lead[1:]}")
        return " ".join(mood_parts)

    # Fallback: tag-driven
    if tags:
        top_tags = [t["name"] for t in sorted(tags, key=lambda x: x["rank"], reverse=True)[:5]]
        return "Notable for: " + ", ".join(top_tags).lower()
    return ""


# ─── fetch composer from Jikan staff ─────────────────────────────────────────

def fetch_composer(mal_id: str) -> str:
    data = jikan_get(f"/anime/{mal_id}/staff")
    staff = data.get("data", [])
    composers = []
    for member in staff:
        positions = member.get("positions", [])
        if any("Music" in p for p in positions):
            name_raw = member.get("person", {}).get("name", "")
            # Jikan returns "Surname, Given" → convert to "Given Surname"
            if "," in name_raw:
                parts = [p.strip() for p in name_raw.split(",", 1)]
                name = f"{parts[1]} {parts[0]}"
            else:
                name = name_raw
            if name:
                composers.append(name)
    return ", ".join(composers[:3])  # cap at 3 names


# ─── main loop ───────────────────────────────────────────────────────────────

with open(CSV_PATH, encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    fieldnames = list(reader.fieldnames)  # type: ignore

needs_composer = [r for r in rows if not r.get("composer", "").strip() and r.get("mal_id")]
needs_mood = [
    r for r in rows
    if r.get("mood_method", "") not in ("IMDb user reviews (snippet synth)", "AniList review synthesis")
    and r.get("mal_id")
]

print(f"Total rows        : {len(rows)}")
print(f"Need composer     : {len(needs_composer)}")
print(f"Need mood (AniList): {len(needs_mood)}")
print()

# Build index for fast row lookup
row_by_id = {r["mal_id"]: r for r in rows}

# ── step 1: composers ─────────────────────────────────────────────────────────
print("=== STEP 1: Fetching composers from Jikan ===")
for i, r in enumerate(needs_composer):
    mal_id = r["mal_id"]
    title = r["title"]
    composer = fetch_composer(mal_id)
    row_by_id[mal_id]["composer"] = composer
    status = composer if composer else "(none found)"
    print(f"  [{i+1:3d}/{len(needs_composer)}]  {title[:45]:<45}  → {status}")
    time.sleep(0.45)

print()

# ── step 2: mood from AniList reviews ────────────────────────────────────────
print("=== STEP 2: Fetching mood from AniList reviews ===")
for i, r in enumerate(needs_mood):
    mal_id = r["mal_id"]
    title = r["title"]
    data = anilist_query(mal_id)

    reviews = data.get("reviews", {}).get("nodes", []) if data else []
    tags = data.get("tags", []) if data else []

    mood = synthesize_mood(reviews, tags)
    if mood:
        row_by_id[mal_id]["mood"] = mood
        row_by_id[mal_id]["mood_method"] = "AniList review synthesis"
    else:
        # keep whatever was there
        pass

    print(f"  [{i+1:3d}/{len(needs_mood)}]  {title[:40]:<40}  rev={len(reviews)}  mood={mood[:60]!r}")
    time.sleep(0.75)

# ── write back ────────────────────────────────────────────────────────────────
with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

composers_filled = sum(1 for r in rows if r.get("composer","").strip())
imdb_mood = sum(1 for r in rows if r.get("mood_method") == "IMDb user reviews (snippet synth)")
anilist_mood = sum(1 for r in rows if r.get("mood_method") == "AniList review synthesis")
print()
print(f"=== Done ===")
print(f"Rows with composer : {composers_filled}/{len(rows)}")
print(f"IMDb mood          : {imdb_mood}")
print(f"AniList mood       : {anilist_mood}")
print(f"Written to {CSV_PATH}")
