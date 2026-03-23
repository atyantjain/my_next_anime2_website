"""
Add two new columns to anime_complete.csv:
  - title_english  : Official English title from MAL (via Jikan)
  - title_japanese : Japanese title from MAL (via Jikan)

Inserted right after the existing 'title_original' column.
Skips rows with no mal_id.
Writes to a temp file and replaces original only on success.
"""

import csv
import os
import sys
import time
import requests

CSV_PATH = os.path.abspath("public/anime_complete.csv")
TMP_PATH = CSV_PATH + ".tmp"


def jikan_get(mal_id: str, retries: int = 4) -> dict:
    url = f"https://api.jikan.moe/v4/anime/{mal_id}"
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=20)
            if r.status_code == 429:
                wait = 10 + attempt * 5
                print(f"    [rate-limit] sleeping {wait}s …", flush=True)
                time.sleep(wait)
                continue
            if r.status_code == 404:
                return {}
            r.raise_for_status()
            return r.json().get("data", {})
        except Exception as exc:
            print(f"    [error] attempt {attempt+1}: {exc}", flush=True)
            time.sleep(3)
    return {}


print(f"CSV: {CSV_PATH}", flush=True)

# ── load ──────────────────────────────────────────────────────────────────────
with open(CSV_PATH, encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    old_fields = list(reader.fieldnames)  # type: ignore

print(f"Loaded {len(rows)} rows, {len(old_fields)} columns", flush=True)

# Skip if columns already exist
if "title_english" in old_fields and "title_japanese" in old_fields:
    print("Columns already present — re-fetching to fill any blanks.", flush=True)
    new_fields = old_fields
else:
    # Insert new columns after 'title_original'
    insert_after = "title_original"
    insert_idx = old_fields.index(insert_after) + 1
    new_fields = (
        old_fields[:insert_idx]
        + ["title_english", "title_japanese"]
        + old_fields[insert_idx:]
    )
    print(f"Inserting title_english + title_japanese after '{insert_after}' (pos {insert_idx})", flush=True)

# Pre-fill so DictWriter doesn't choke on missing keys
for row in rows:
    row.setdefault("title_english", "")
    row.setdefault("title_japanese", "")

print(f"Starting Jikan fetch …\n", flush=True)

# ── fetch in-place (resumable: skip rows already filled) ─────────────────────
already = sum(1 for r in rows if r.get("title_english", "").strip())
print(f"Already filled: {already}/{len(rows)}", flush=True)

errors = 0
changed = 0
for i, row in enumerate(rows):
    # Skip if already filled
    if row.get("title_english", "").strip() or row.get("title_japanese", "").strip():
        print(f"  [{i+1:3d}/{len(rows)}]  {row['title'][:40]:<42}  [skip — already filled]", flush=True)
        continue

    mal_id = row.get("mal_id", "").strip()
    if not mal_id:
        print(f"  [{i+1:3d}/{len(rows)}]  {row['title'][:40]:<42}  [no mal_id]", flush=True)
        continue

    try:
        data = jikan_get(mal_id)
        row["title_english"] = (data.get("title_english") or "").strip()
        row["title_japanese"] = (data.get("title_japanese") or "").strip()
        status = f"en={row['title_english'][:35]!r:<37}  jp={row['title_japanese'][:25]!r}"
        changed += 1
    except Exception as exc:
        errors += 1
        status = f"EXCEPTION: {exc}"

    # Write the entire CSV after each row so progress is saved on interrupt
    with open(TMP_PATH, "w", encoding="utf-8", newline="") as tmp_f:
        w = csv.DictWriter(tmp_f, fieldnames=new_fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    os.replace(TMP_PATH, CSV_PATH)

    print(f"  [{i+1:3d}/{len(rows)}]  {row['title'][:40]:<42}  {status}", flush=True)
    time.sleep(0.45)

print(f"\nFetch complete. New: {changed}, Errors: {errors}", flush=True)

# ── verify ─────────────────────────────────────────────────────────────────────
with open(CSV_PATH, encoding="utf-8") as f:
    verify_reader = csv.DictReader(f)
    verify_rows = list(verify_reader)
    verify_fields = list(verify_reader.fieldnames)  # type: ignore

filled_eng = sum(1 for r in verify_rows if r.get("title_english", "").strip())
filled_jpn = sum(1 for r in verify_rows if r.get("title_japanese", "").strip())

print(f"\n=== Done ===")
print(f"Columns : {len(verify_fields)}")
print(f"Rows    : {len(verify_rows)}")
print(f"title_english filled : {filled_eng}/{len(verify_rows)}")
print(f"title_japanese filled: {filled_jpn}/{len(verify_rows)}")
print(f"Written to {CSV_PATH}")
