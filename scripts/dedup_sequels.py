import csv
import re

CSV_PATH = "public/anime_complete.csv"

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

SUFFIX_RE = re.compile(
    r"[\s:\-]*(season\s+\d+.*|part\s+\d+.*|cour\s+\d+.*"
    r"|\d+\s*nd\s+season.*|\d+\s*rd\s+season.*|\d+\s*th\s+season.*"
    r"|second\s+season.*|third\s+season.*|fourth\s+season.*"
    r"|fifth\s+season.*|the\s+final.*)\s*$",
    re.IGNORECASE,
)


def franchise_base(title):
    b = SUFFIX_RE.sub("", title).strip().rstrip(":-").strip().lower()
    return b if b else title.lower()


with open(CSV_PATH, encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    fieldnames = list(reader.fieldnames)

print("Before:", len(rows))

sequel_bases_seen = {}
final = []

for r in rows:
    t = r.get("title", "").strip()
    if SEQUEL_FLAG.search(t):
        b = franchise_base(t)
        if b in sequel_bases_seen:
            print("DROP duplicate franchise sequel:", t)
            continue
        sequel_bases_seen[b] = t
    final.append(r)

print("After:", len(final))

with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(final)

print("Done")
