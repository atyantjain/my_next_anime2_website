import csv

with open("public/anime_complete.csv", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

have_composer = sum(1 for r in rows if r.get("composer", "").strip())
have_imdb_mood = sum(1 for r in rows if r.get("mood_method") == "IMDb user reviews (snippet synth)")
have_anilist_mood = sum(1 for r in rows if r.get("mood_method") == "AniList review synthesis")
no_mood = sum(1 for r in rows if not r.get("mood", "").strip())
no_composer = sum(1 for r in rows if not r.get("composer", "").strip())

print("=== Coverage ===")
total = len(rows)
print("Total rows          :", total)
print("Composer filled     :", have_composer, "/", total)
print("Missing composer    :", no_composer)
print("IMDb mood           :", have_imdb_mood)
print("AniList review mood :", have_anilist_mood)
print("No mood at all      :", no_mood)
print()
print("=== Sample new entries (rows 300-305) ===")
for r in rows[300:305]:
    title = r["title"]
    comp = r.get("composer") or "(none)"
    mood = r.get("mood", "")[:100] or "(none)"
    mm = r.get("mood_method", "")
    print("title   :", title)
    print("composer:", comp)
    print("mood    :", mood)
    print("method  :", mm)
    print()
