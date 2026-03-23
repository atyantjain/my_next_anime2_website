/**
 * Web Worker for the anime recommendation engine.
 * Loads the CSV once, builds TF-IDF on demand, and responds to postMessage calls.
 *
 * Message types (main → worker):
 *   { type: "INIT" }                          → worker fetches & parses CSV
 *   { type: "RECOMMEND", payload: params }    → returns recommendations
 *   { type: "GET_ANIME", payload: { title } } → returns single anime details
 *
 * Message types (worker → main):
 *   { type: "READY", payload: { titles: TitleEntry[] } }
 *   { type: "RECOMMEND_RESULT", payload: AnimeOut[] }
 *   { type: "ANIME_RESULT", payload: AnimeOut | null }
 *   { type: "ERROR", payload: string }
 */

import Papa from "papaparse";
import {
  AnimeRow,
  AnimeOut,
  FeatureWeights,
  RecommendParams,
  TfidfMatrix,
  buildTfidfMatrix,
  recommend,
  rowToOut,
} from "@/lib/tfidf";

// ─── state ────────────────────────────────────────────────────────────────────

let _df: AnimeRow[] = [];
/** cache: weights key → matrix */
const _cache = new Map<string, TfidfMatrix>();

function weightsKey(w: FeatureWeights) {
  return `${w.genres},${w.themes},${w.composer},${w.mood},${w.studio},${w.synopsis}`;
}

function getMatrix(weights: FeatureWeights, featureTexts: string[]): TfidfMatrix {
  const key = weightsKey(weights);
  if (!_cache.has(key)) {
    _cache.set(key, buildTfidfMatrix(featureTexts));
  }
  return _cache.get(key)!;
}

// ─── CSV loader ───────────────────────────────────────────────────────────────

async function loadCsv(): Promise<AnimeRow[]> {
  const baseUrl = self.location.origin;
  const res = await fetch(`${baseUrl}/anime_complete.csv`);
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
  const text = await res.text();

  return new Promise((resolve, reject) => {
    Papa.parse<AnimeRow>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data
          .filter((r) => r.title && r.title.trim())
          .reduce<AnimeRow[]>((acc, row) => {
            // deduplicate by title (keep first)
            if (!acc.find((r) => r.title === row.title)) acc.push(row);
            return acc;
          }, []);
        resolve(rows);
      },
      error: reject,
    });
  });
}

// ─── feature text builders (mirrors buildFeatureText but re-built per weights) ──

function buildFeatureTexts(df: AnimeRow[], weights: FeatureWeights): string[] {
  function cleanText(x: string): string {
    if (!x) return "";
    let s = x.toLowerCase();
    s = s.replace(/<[^>]+>/g, " ");
    s = s.replace(/[^a-z0-9\s]+/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  /** Turn "A-1 Pictures, Bones" → "a1_pictures bones" (atomic tokens per value) */
  function compoundTokens(value: string): string {
    if (!value) return "";
    const sep = value.includes("|") ? "|" : ",";
    return value
      .split(sep)
      .map((v) =>
        v.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "_").replace(/^_|_$/g, "")
      )
      .filter((v) => v.length > 1)
      .join(" ");
  }

  return df.map((row) => {
    const title = row.title ?? "";
    const synopsis = row.synopsis ?? "";
    const genres = row.genres ?? "";
    const themes = row.themes ?? "";
    const studio = row.studios ?? "";
    const composer = row.composer ?? "";
    const mood = row.mood ?? "";

    const parts = [
      cleanText(title),
      (compoundTokens(genres) + " ").repeat(weights.genres),
      (compoundTokens(themes) + " ").repeat(weights.themes),
      (compoundTokens(composer) + " ").repeat(weights.composer),
      (compoundTokens(mood) + " ").repeat(weights.mood),
      (compoundTokens(studio) + " ").repeat(weights.studio),
      (cleanText(synopsis) + " ").repeat(weights.synopsis),
    ];
    return parts.join(" ").replace(/\s+/g, " ").trim();
  });
}

// ─── message handler ─────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  try {
    if (type === "INIT") {
      _df = await loadCsv();
      const titles = _df.map((r) => ({ title: r.title, artwork_url: r.artwork_url ?? "" }));
      self.postMessage({ type: "READY", payload: { titles } });
      return;
    }

    if (type === "GET_ANIME") {
      const { title } = payload as { title: string };
      const row = _df.find((r) => r.title === title);
      const result: AnimeOut | null = row ? rowToOut(row, 0) : null;
      self.postMessage({ type: "ANIME_RESULT", payload: result });
      return;
    }

    if (type === "RECOMMEND") {
      const params = payload as RecommendParams;
      const featureTexts = buildFeatureTexts(_df, params.weights);
      const matrix = getMatrix(params.weights, featureTexts);
      const results = recommend(_df, matrix, params);
      self.postMessage({ type: "RECOMMEND_RESULT", payload: results });
      return;
    }
  } catch (err) {
    self.postMessage({ type: "ERROR", payload: String(err) });
  }
};
