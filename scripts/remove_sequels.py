"""
Post-processing pass: remove sequel entries from the already-merged CSV
that belong to franchises already represented in the dataset.
"""

import csv
import re
from collections import defaultdict

CSV_PATH = "public/anime_complete.csv"

# ── improved base-title extractor ────────────────────────────────────────────
# Strips anything that looks like a season/part/cour suffix,
# with or without a preceding colon/dash.
SUFFIX_RE = re.compile(
    r"[\s:\-–]*("
    r"season\s+\d+"
    r"|part\s+\d+"
    r"|cour\s+\d+"
    r"|\d+\s*nd\s+season"
    r"|\d+\s*rd\s+season"
    r"|\d+\s*th\s+season"
    r"|second\s+season"
    r"|third\s+season"
    r"|fourth\s+season"
    r"|fifth\s+season"
    r"|final\s+season"
    r")\s*$",
    re.IGNORECASE,
)
# Also strip trailing roman numeral " II / III / IV / V" (word boundary)
ROMAN_SUFFIX_RE = re.compile(r"\s+\b(ii|iii|iv|v|vi)\b\s*$", re.IGNORECASE)
# Standalone trailing digit like "Gintama Season 4" → after SUFFIX_RE removes "Season 4" it becomes "Gintama"
# But for "Gintama 4" we do:
TRAILING_NUM_RE = re.compile(r"\s+\d+\s*$")

# Sequel detection (for flagging entries to evaluate)
SEQUEL_FLAG = re.compile(
    r"\b(2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\s+season\b"
    r"|\bseason\s+[2-9]\b"
    r"|\bpart\s+[2-9]\b"
    r"|\bcour\s+[2-9]\b"
    r"|\bfinal\s+season\b"
    r"|\b(ii|iii|iv|v|vi)\b"
    r"|\b[2-9](nd|rd|th)\b",
    re.IGNORECASE,
)


def base_title(raw: str) -> str:
    t = raw.strip()
    # strip suffix patterns iteratively (handles "Season 3 Part 2")
    for _ in range(4):
        t2 = SUFFIX_RE.sub("", t).strip()
        t2 = ROMAN_SUFFIX_RE.sub("", t2).strip()
        t2 = TRAILING_NUM_RE.sub("", t2).strip()
        if t2 == t:
            break
        t = t2
    return t.lower()


# ── load ──────────────────────────────────────────────────────────────────────
with open(CSV_PATH, encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    fieldnames = list(reader.fieldnames)  # type: ignore

print(f"Loaded {len(rows)} rows")

# ── first pass: collect base titles of non-sequel entries ────────────────────
# (original 310 are assumed clean; for new entries we also keep non-sequels)
non_sequel_bases: set[str] = set()
non_sequel_rows: list[dict] = []
sequel_candidates: list[dict] = []

for r in rows:
    t = r.get("title", "").strip()
    if not t:
        continue
    if SEQUEL_FLAG.search(t):
        sequel_candidates.append(r)
    else:
        b = base_title(t)
        non_sequel_bases.add(b)
        non_sequel_rows.append(r)

print(f"Non-sequel entries : {len(non_sequel_rows)}")
print(f"Sequel candidates  : {len(sequel_candidates)}")

# ── second pass: keep sequel entries only if their base isn't already covered ─
kept_sequels: list[dict] = []
dropped_sequels: list[dict] = []

for r in sequel_candidates:
    t = r.get("title", "").strip()
    b = base_title(t)
    if b in non_sequel_bases:
        dropped_sequels.append(r)
    else:
        # base not yet represented → keep this as a standalone entry
        kept_sequels.append(r)
        non_sequel_bases.add(b)   # prevent further sequels of the same base
        non_sequel_rows.append(r)

print(f"Sequences kept (base not in dataset): {len(kept_sequels)}")
print(f"Sequels dropped (base already in): {len(dropped_sequels)}")
if dropped_sequels[:10]:
    print("  Dropped examples:")
    for r in dropped_sequels[:10]:
        print(f"    {r['title']!r}  (base={base_title(r['title'])!r})")

# ── final dedup by exact title ────────────────────────────────────────────────
seen: set[str] = set()
final: list[dict] = []
for r in non_sequel_rows:
    key = r["title"].strip().lower()
    if key not in seen:
        seen.add(key)
        final.append(r)

print(f"\nFinal row count: {len(final)}")

with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(final)

print(f"Written to {CSV_PATH}")
