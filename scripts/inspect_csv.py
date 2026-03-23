import csv

with open("public/anime_complete.csv", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

have_composer = [r for r in rows if r.get("composer","").strip()]
have_imdb = [r for r in rows if r.get("imdb_review_url","").strip()]
missing_composer = [r for r in rows if not r.get("composer","").strip()]
missing_mood = [r for r in rows if r.get("mood_method","") != "IMDb user reviews (snippet synth)"]

print("Have composer:", len(have_composer))
print("Have imdb_review_url:", len(have_imdb))
print("Missing composer:", len(missing_composer))
print("Not IMDb-synth mood:", len(missing_mood))
print()

print("Sample with IMDb mood:")
for r in rows[:3]:
    t = r["title"]
    c = r["composer"]
    url = r["imdb_review_url"]
    m = r["mood"][:120]
    mm = r["mood_method"]
    print(" title:", t)
    print(" composer:", c)
    print(" imdb_review_url:", url)
    print(" mood:", m)
    print(" mood_method:", mm)
    print()

print("Sample missing composer (new entries):")
for r in missing_composer[:8]:
    t = r["title"]
    mid = r["mal_id"]
    print(" title:", t, "| mal_id:", mid)
