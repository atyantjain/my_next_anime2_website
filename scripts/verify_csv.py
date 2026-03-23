import csv
import re
from collections import Counter

with open("public/anime_complete.csv", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print("Total rows:", len(rows))
scores = [float(r["score"]) for r in rows if r.get("score") and r["score"].strip()]
print(f"Score range: {min(scores):.2f} - {max(scores):.2f}")

title_counts = Counter(r["title"].lower().strip() for r in rows)
dupes = [(t, c) for t, c in title_counts.items() if c > 1]
print("Duplicate titles:", len(dupes))
for t, c in dupes[:10]:
    print(f"  ({c}x)", repr(t))

SEQUEL = re.compile(r'\b(2nd|3rd|4th|5th)\s+season\b|\bseason\s+[2-9]\b|\bpart\s+[2-9]\b', re.I)
sequels = [r["title"] for r in rows if SEQUEL.search(r["title"])]
print("\nSequel-pattern titles leaked:", len(sequels))
for t in sequels[:15]:
    print("  ", repr(t))

print("\nSample new entries (rows 311-315):")
for r in rows[310:315]:
    title = r["title"]
    score = r["score"]
    genres = r["genres"][:60]
    mood = r["mood"][:80]
    print("  title =", repr(title))
    print("  score =", score, " genres =", repr(genres))
    print("  mood  =", repr(mood))
    print()
