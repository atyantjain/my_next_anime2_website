"""
FastAPI backend for anime recommendations.
Uses TF-IDF + cosine similarity (same logic as app.py).
"""

import re
import hashlib
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ──────────────────────────────────────────────
# Config – point this at your CSV
# ──────────────────────────────────────────────
CSV_PATH = Path(__file__).resolve().parent / "anime_complete.csv"

app = FastAPI(title="Anime Recommender API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Data helpers (ported from app.py)
# ──────────────────────────────────────────────

def _clean_text(x: str) -> str:
    if pd.isna(x):
        return ""
    x = str(x).lower()
    x = re.sub(r"<[^>]+>", " ", x)
    x = re.sub(r"[^a-z0-9\s]+", " ", x)
    x = re.sub(r"\s+", " ", x).strip()
    return x


def _safe_col(df: pd.DataFrame, col: str) -> pd.Series:
    return df[col].fillna("").astype(str) if col in df.columns else pd.Series([""] * len(df))


def build_feature_text(df: pd.DataFrame, weights: dict) -> pd.Series:
    title = _safe_col(df, "title")
    synopsis = _safe_col(df, "synopsis")
    genres = _safe_col(df, "genres")
    themes = _safe_col(df, "themes")
    studio = _safe_col(df, "studio") if "studio" in df.columns else _safe_col(df, "studios")
    composer = _safe_col(df, "composer")
    mood = _safe_col(df, "mood")

    combined = (
        (title + " ") * 1
        + (genres + " ") * weights.get("genres", 3)
        + (themes + " ") * weights.get("themes", 2)
        + (composer + " ") * weights.get("composer", 3)
        + (mood + " ") * weights.get("mood", 3)
        + (studio + " ") * weights.get("studio", 1)
        + (synopsis + " ") * weights.get("synopsis", 2)
    )
    return combined.map(_clean_text)


# ──────────────────────────────────────────────
# Global state – loaded once at startup
# ──────────────────────────────────────────────
_df: pd.DataFrame = pd.DataFrame()
_tfidf_cache: dict = {}  # weights_hash -> (vectorizer, tfidf_matrix)


def _load_data():
    global _df
    if not CSV_PATH.exists():
        raise RuntimeError(f"CSV not found at {CSV_PATH}. Copy anime_complete.csv into the backend/ folder.")
    df = pd.read_csv(CSV_PATH)
    df = df.dropna(subset=["title"]).copy()
    df["title"] = df["title"].astype(str).str.strip()
    df = df.drop_duplicates(subset=["title"], keep="first").reset_index(drop=True)

    # normalise column name: app.py uses "studio", CSV may have "studios"
    if "studios" in df.columns and "studio" not in df.columns:
        df["studio"] = df["studios"]

    _df = df


def _get_tfidf(weights: dict):
    h = hashlib.md5(str(sorted(weights.items())).encode()).hexdigest()
    if h not in _tfidf_cache:
        feature_text = build_feature_text(_df, weights)
        vec = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.90,
            sublinear_tf=True,
        )
        mat = vec.fit_transform(feature_text)
        _tfidf_cache[h] = (vec, mat)
    return _tfidf_cache[h]


# ──────────────────────────────────────────────
# Pydantic models
# ──────────────────────────────────────────────

class FeatureWeights(BaseModel):
    genres: int = 3
    themes: int = 2
    composer: int = 3
    mood: int = 3
    studio: int = 1
    synopsis: int = 2


class RecommendRequest(BaseModel):
    title: str
    top_k: int = 12
    min_score: Optional[float] = None
    same_genre_only: bool = False
    same_composer_only: bool = False
    feature_weights: FeatureWeights = FeatureWeights()


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@app.on_event("startup")
def startup():
    _load_data()


def _row_to_dict(row: pd.Series) -> dict:
    """Convert a DF row to the shape the frontend expects."""
    genres_raw = str(row.get("genres", ""))
    themes_raw = str(row.get("themes", ""))

    # Handle both comma-separated and pipe-separated formats
    genre_sep = "|" if "|" in genres_raw else ","
    theme_sep = "|" if "|" in themes_raw else ","

    return {
        "title": str(row.get("title", "")),
        "synopsis": str(row.get("synopsis", "")),
        "genres": [g.strip() for g in genres_raw.split(genre_sep) if g.strip()],
        "themes": [t.strip() for t in themes_raw.split(theme_sep) if t.strip()],
        "score": float(row["score"]) if pd.notna(row.get("score")) else 0,
        "episodes": int(row["episodes"]) if pd.notna(row.get("episodes")) else 0,
        "aired": str(row.get("aired", "")),
        "studios": str(row.get("studios", row.get("studio", ""))),
        "composer": str(row.get("composer", "")),
        "mood": str(row.get("mood", "")),
        "artwork_url": str(row.get("artwork_url", "")),
    }


@app.get("/titles")
def get_titles():
    """Return all anime titles with artwork URLs (for the search dropdown)."""
    subset = _df[["title", "artwork_url"]].dropna(subset=["title"]).copy()
    subset = subset.sort_values("title")
    items = [
        {"title": str(row["title"]), "artwork_url": str(row.get("artwork_url", ""))}
        for _, row in subset.iterrows()
    ]
    return {"titles": items}


@app.get("/anime/{title}")
def get_anime(title: str):
    """Return full details for one anime."""
    match = _df[_df["title"] == title]
    if match.empty:
        raise HTTPException(404, "Title not found")
    return _row_to_dict(match.iloc[0])


@app.post("/recommend")
def recommend(req: RecommendRequest):
    weights = req.feature_weights.model_dump()
    _, tfidf_matrix = _get_tfidf(weights)

    title_to_idx = {t: i for i, t in enumerate(_df["title"].tolist())}
    if req.title not in title_to_idx:
        raise HTTPException(404, f"Title '{req.title}' not found in dataset")

    idx = title_to_idx[req.title]
    sims = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).ravel()
    sims[idx] = -1

    ranked_idx = np.argsort(-sims)
    cand = _df.iloc[ranked_idx].copy()
    cand["similarity"] = sims[ranked_idx]

    if req.min_score is not None and "score" in cand.columns:
        cand = cand[pd.to_numeric(cand["score"], errors="coerce").fillna(-1) >= req.min_score]

    if req.same_genre_only and "genres" in _df.columns:
        base_genres = set(str(_df.loc[idx, "genres"]).lower().split(","))
        base_genres = {g.strip() for g in base_genres if g.strip()}

        def overlaps(genres_str):
            gs = {g.strip() for g in str(genres_str).lower().split(",") if g.strip()}
            return len(base_genres & gs) > 0

        cand = cand[cand["genres"].apply(overlaps)]

    if req.same_composer_only and "composer" in _df.columns:
        base_composer = str(_df.loc[idx, "composer"]).strip().lower()
        if base_composer:
            cand = cand[cand["composer"].apply(
                lambda c: base_composer in str(c).lower()
            )]

    cand = cand.head(req.top_k)

    results = []
    for _, row in cand.iterrows():
        d = _row_to_dict(row)
        d["similarity_score"] = round(float(row["similarity"]), 4)
        results.append(d)

    return {"recommendations": results}
