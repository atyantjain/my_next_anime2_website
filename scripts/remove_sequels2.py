"""
Improved sequel cleanup: build a fuzzy base-title lookup from ALL entries
so that merged/alternate-titled originals also block their sequels.
"""

import csv
import re

CSV_PATH = "public/anime_complete.csv"

# ── patterns ──────────────────────────────────────────────────────────────────
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
    r"|next\s+passage(?:\s+part\s+\d+)?"
    r"|the\s+final"
    r"|arc\s+\d+"
    r"|\s*[:\-–]\s*.+$"           # last resort: strip everything after : or –
    r")\s*$",
    re.IGNORECASE,
)
ROMAN_SUFFIX_RE = re.compile(r"\s+\b(ii|iii|iv|v|vi)\b\s*$", re.IGNORECASE)
TRAILING_NUM_RE = re.compile(r"\s+\d+\s*$")

SEQUEL_FLAG = re.compile(
    r"\b(2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\s+season\b"
    r"|\bseason\s+[2-9]\b"
    r"|\bpart\s+[2-9]\b"
    r"|\bcour\s+[2-9]\b"
    r"|\bfinal\s+season\b"
    r"|\bthe\s+final\b"
    r"|\b(ii|iii|iv|v|vi)\b"
    r"|\b[2-9](nd|rd|th)\b",
    re.IGNORECASE,
)


def all_bases(raw: str) -> list[str]:
    """Return all intermediate base titles produced by stripping suffixes."""
    t = raw.strip()
    bases = [t.lower()]
    for _ in range(6):
        t2 = SUFFIX_RE.sub("", t).strip()
        t2 = ROMAN_SUFFIX_RE.sub("", t2).strip()
        t2 = TRAILING_NUM_RE.sub("", t2).strip()
        t2 = re.sub(r"\s*[:\-–]\s*$", "", t2).strip()
        if t2 == t or len(t2) < 2:
            break
        t = t2
        bases.append(t.lower())
    return bases


def short_base(raw: str) -> str:
    """Return the shortest base title (most stripped form)."""
    return all_bases(raw)[-1]


# ── load ──────────────────────────────────────────────────────────────────────
with open(CSV_PATH, encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    fieldnames = list(reader.fieldnames)  # type: ignore

print(f"Loaded {len(rows)} rows")

# ── build coverage set: all base forms of every existing title ────────────────
covered_bases: set[str] = set()
for r in rows:
    t = r.get("title", "").strip()
    if t:
        for b in all_bases(t):
            covered_bases.add(b)
        # also add the merged_titles variants
        for mt in re.split(r"\s*\|\s*", r.get("merged_titles", "")):
            mt = mt.strip()
            if mt:
                for b in all_bases(mt):
                    covered_bases.add(b)

print(f"Covered base-title variants: {len(covered_bases)}")

# ── filter: remove sequels whose franchise is already covered ─────────────────
final: list[dict] = []
dropped = 0

for r in rows:
    t = r.get("title", "").strip()
    if not t:
        continue

    if not SEQUEL_FLAG.search(t):
        final.append(r)
        continue

    # It's a sequel — check if a shorter base is ALREADY represented
    bases = all_bases(t)
    franchise_already_covered = any(b in covered_bases for b in bases[1:])  # skip itself

    if franchise_already_covered:
        dropped += 1
        # print(f"  DROP: {t!r}  (base={bases[-1]!r})")
    else:
        final.append(r)

print(f"Dropped {dropped} sequel entries")
print(f"Final row count: {len(final)}")

# ── dedup exact titles ────────────────────────────────────────────────────────
seen: set[str] = set()
deduped: list[dict] = []
for r in final:
    key = r["title"].strip().lower()
    if key not in seen:
        seen.add(key)
        deduped.append(r)

print(f"After exact-title dedup: {len(deduped)}")

with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(deduped)

print(f"Written ✓")
