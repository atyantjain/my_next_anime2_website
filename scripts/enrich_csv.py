"""
Fetch additional anime entries from Jikan v4 API and merge with existing CSV.
- Keeps identical columns/format
- Skips entries already in CSV (by mal_id)
- Skips sequels/seasons of shows already in the dataset
- Score threshold: 7.50+ to get quality entries
"""

import csv
import re
import time
import requests

CSV_PATH = "public/anime_complete.csv"
OUTPUT_PATH = "public/anime_complete.csv"
TARGET_NEW = 400          # how many new entries to aim for
MIN_SCORE = 7.50
MAX_PAGES = 50            # 50 pages × 25 = 1250 candidates from Jikan top list

# ── sequel / season detection patterns ──────────────────────────────────────
SEQUEL_PATTERNS = re.compile(
    r"\b(2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\s+season\b"
    r"|\bseason\s+[2-9]\b"
    r"|\bpart\s+[2-9]\b"
    r"|\bcour\s+[2-9]\b"
    r"|\bchapter\s+[2-9]\b"
    r"|\b(ii|iii|iv|v|vi)\b"            # Roman numerals II, III, IV …
    r"|\b[2-9](nd|rd|th)\b"             # 2nd, 3rd, 4th standalone
    r"|:\s*(second|third|fourth|fifth)\s+(season|arc|chapter|cour)\b",
    re.IGNORECASE,
)

# Strip common season suffixes to get the "base" title for dedup
STRIP_SUFFIX = re.compile(
    r"\s*[:\-–]\s*(season\s+\d+|part\s+\d+|cour\s+\d+|[2-9](nd|rd|th)\s+season"
    r"|second\s+season|third\s+season|fourth\s+season|\d+th\s+season)\s*$",
    re.IGNORECASE,
)


def base_title(title: str) -> str:
    t = STRIP_SUFFIX.sub("", title).strip()
    # also strip trailing " 2", " 3" etc.
    t = re.sub(r"\s+[2-9]\s*$", "", t).strip()
    return t.lower()


def join_names(items: list, key: str = "name", sep: str = " | ") -> str:
    return sep.join(i[key] for i in items if i.get(key))


def build_mood(genres: str, themes: str, synopsis: str) -> str:
    """Generate a lightweight mood string from available metadata."""
    tags = [g.strip() for g in re.split(r"[|,]", genres + "," + themes) if g.strip()]
    if not tags:
        return ""
    # simple keyword → tone map
    tone_map = {
        "Action": "action-packed",
        "Adventure": "adventurous",
        "Comedy": "lighthearted and funny",
        "Drama": "emotionally resonant",
        "Fantasy": "fantastical",
        "Horror": "dark and unsettling",
        "Mystery": "mysterious",
        "Romance": "warm and romantic",
        "Sci-Fi": "science fiction",
        "Slice of Life": "relaxed slice-of-life",
        "Sports": "high-energy sports",
        "Supernatural": "supernatural",
        "Thriller": "tense thriller",
        "Psychological": "psychologically intense",
        "Mecha": "mecha-driven",
        "Military": "military drama",
        "Music": "music-driven",
        "Isekai": "isekai adventure",
        "Historical": "historically grounded",
        "School": "school setting",
        "Shounen": "shounen energy",
        "Seinen": "mature seinen",
        "Josei": "josei",
        "Shoujo": "shoujo",
    }
    tones = [tone_map[t] for t in tags if t in tone_map]
    if not tones:
        return ", ".join(tags[:3])
    desc = ", ".join(dict.fromkeys(tones[:4]))  # deduplicate, keep order
    # append first sentence of synopsis if available
    if synopsis:
        first_sent = re.split(r"(?<=[.!?])\s", synopsis)[0]
        if len(first_sent) < 200:
            desc += f" — {first_sent}"
    return desc


# ── load existing CSV ────────────────────────────────────────────────────────
with open(CSV_PATH, encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    existing_rows = list(reader)
    fieldnames = list(reader.fieldnames)  # type: ignore

existing_mal_ids: set[str] = {r["mal_id"] for r in existing_rows if r.get("mal_id")}
# base titles of everything already in the dataset
existing_bases: set[str] = {base_title(r["title"]) for r in existing_rows if r.get("title")}

print(f"Existing entries : {len(existing_rows)}")
print(f"Existing MAL IDs : {len(existing_mal_ids)}")

# ── fetch from Jikan ─────────────────────────────────────────────────────────
new_rows: list[dict] = []
page = 1

while page <= MAX_PAGES and len(new_rows) < TARGET_NEW:
    url = f"https://api.jikan.moe/v4/top/anime?page={page}&limit=25"
    try:
        resp = requests.get(url, timeout=20)
        if resp.status_code == 429:
            print(f"  Rate-limited on page {page}, sleeping 4s …")
            time.sleep(4)
            continue
        resp.raise_for_status()
        items = resp.json().get("data", [])
        if not items:
            print("No more data from Jikan.")
            break
    except Exception as exc:
        print(f"  Error on page {page}: {exc} — sleeping 3s")
        time.sleep(3)
        page += 1
        continue

    added_this_page = 0
    for item in items:
        mal_id = str(item.get("mal_id", ""))

        # --- skip already-present ---
        if mal_id in existing_mal_ids:
            continue

        # --- build title: prefer English, fall back to romanized ---
        title_eng = (item.get("title_english") or "").strip()
        title_orig = (item.get("title") or "").strip()
        title = title_eng if title_eng else title_orig
        if not title:
            continue

        # --- skip sequels of shows already in the combined dataset ---
        b = base_title(title)
        if SEQUEL_PATTERNS.search(title):
            # only add if the base series is NOT already represented
            if b in existing_bases or any(
                base_title(r["title"]) == b for r in new_rows
            ):
                continue

        # --- score filter ---
        score = item.get("score")
        if score is None or score == "":
            continue
        try:
            if float(score) < MIN_SCORE:
                continue
        except (ValueError, TypeError):
            continue

        # --- derive fields ---
        all_genres_raw = item.get("genres", []) + item.get("demographics", [])
        genres = join_names(all_genres_raw)
        themes = join_names(item.get("themes", []))
        studios = join_names(item.get("studios", []), sep=", ")
        synopsis = (item.get("synopsis") or "").replace("\n", " ").strip()
        episodes = item.get("episodes") or ""

        # year from aired.prop.from.year
        year = ""
        try:
            year = str(item["aired"]["prop"]["from"]["year"] or "")
        except (KeyError, TypeError):
            if item.get("year"):
                year = str(item["year"])

        artwork_url = (
            item.get("images", {}).get("jpg", {}).get("large_image_url")
            or item.get("images", {}).get("jpg", {}).get("image_url")
            or ""
        )

        mood = build_mood(genres, themes, synopsis)

        row: dict = {
            "title": title,
            "title_original": title_orig,
            "merged_titles": title_orig,
            "n_entries_merged": "1",
            "synopsis": synopsis,
            "genres": genres,
            "themes": themes,
            "score": str(score),
            "episodes": str(episodes),
            "aired": year,
            "studios": studios,
            "composer": "",
            "composer_source_url": "",
            "features": "",
            "mood": mood,
            "mood_method": "genre/theme synthesis",
            "imdb_review_url": "",
            "artwork": "",
            "mal_id": mal_id,
            "mal_url": f"https://myanimelist.net/anime/{mal_id}",
            "artwork_url": artwork_url,
            "mal_title_matched": title_orig,
            "mal_match_score": "1.0",
        }

        new_rows.append(row)
        existing_mal_ids.add(mal_id)
        existing_bases.add(b)
        added_this_page += 1

    print(f"Page {page:02d}: +{added_this_page:3d} new  |  total new so far: {len(new_rows)}")
    page += 1
    time.sleep(0.4)  # stay under Jikan's 3 req/s limit

# ── write merged CSV ─────────────────────────────────────────────────────────
all_rows = existing_rows + new_rows
# final dedup by title (case-insensitive), keep first occurrence
seen_titles: set[str] = set()
deduped: list[dict] = []
for r in all_rows:
    key = r["title"].strip().lower()
    if key and key not in seen_titles:
        seen_titles.add(key)
        deduped.append(r)

print(f"\nFinal row count : {len(deduped)}  (was {len(existing_rows)}, added {len(new_rows)})")

with open(OUTPUT_PATH, "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(deduped)

print(f"Written to {OUTPUT_PATH}")
