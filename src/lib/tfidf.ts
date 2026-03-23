/**
 * Pure-TypeScript TF-IDF + cosine-similarity engine.
 * Mirrors the Python logic in backend/server.py.
 */

export interface AnimeRow {
  title: string;
  title_original: string;
  synopsis: string;
  genres: string;
  themes: string;
  score: string;
  episodes: string;
  aired: string;
  studios: string;
  composer: string;
  mood: string;
  artwork_url: string;
  [key: string]: string;
}

export interface FeatureWeights {
  genres: number;
  themes: number;
  composer: number;
  mood: number;
  studio: number;
  synopsis: number;
}

export interface AnimeOut {
  title: string;
  synopsis: string;
  genres: string[];
  themes: string[];
  score: number;
  episodes: number;
  aired: string;
  studios: string;
  composer: string;
  mood: string;
  artwork_url: string;
  similarity_score: number;
}

// ─── text helpers ────────────────────────────────────────────────────────────

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

function buildFeatureText(rows: AnimeRow[], weights: FeatureWeights): string[] {
  return rows.map((row) => {
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

// ─── TF-IDF ──────────────────────────────────────────────────────────────────

const ENGLISH_STOP_WORDS = new Set([
  "a","about","above","after","again","against","all","am","an","and","any","are","aren't","as","at",
  "be","because","been","before","being","below","between","both","but","by","can't","cannot","could",
  "couldn't","did","didn't","do","does","doesn't","doing","don't","down","during","each","few","for",
  "from","further","get","got","had","hadn't","has","hasn't","have","haven't","having","he","he'd",
  "he'll","he's","her","here","here's","hers","herself","him","himself","his","how","how's","i","i'd",
  "i'll","i'm","i've","if","in","into","is","isn't","it","it's","its","itself","let's","me","more",
  "most","mustn't","my","myself","no","nor","not","of","off","on","once","only","or","other","ought",
  "our","ours","ourselves","out","over","own","same","shan't","she","she'd","she'll","she's","should",
  "shouldn't","so","some","such","than","that","that's","the","their","theirs","them","themselves",
  "then","there","there's","these","they","they'd","they'll","they're","they've","this","those","through",
  "to","too","under","until","up","very","was","wasn't","we","we'd","we'll","we're","we've","were",
  "weren't","what","what's","when","when's","where","where's","which","while","who","who's","whom",
  "why","why's","with","won't","would","wouldn't","you","you'd","you'll","you're","you've","your",
  "yours","yourself","yourselves",
]);

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((t) => t.length > 1 && !ENGLISH_STOP_WORDS.has(t));
}

function buildBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

function getTerms(text: string): string[] {
  const tokens = tokenize(text);
  return [...tokens, ...buildBigrams(tokens)];
}

export interface TfidfMatrix {
  vocab: Map<string, number>;
  /** rows × vocab sparse representation: Map<termIndex, tfidf>[] */
  rows: Map<number, number>[];
  /** row L2 norms */
  norms: Float32Array;
}

/**
 * Build a TF-IDF matrix (sublinear TF, min_df=2, max_df=0.90).
 */
export function buildTfidfMatrix(docs: string[]): TfidfMatrix {
  const n = docs.length;

  // tokenize all docs
  const docTerms: string[][] = docs.map(getTerms);

  // document frequency
  const df = new Map<string, number>();
  for (const terms of docTerms) {
    for (const t of new Set(terms)) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }

  // filter: min_df=2, max_df=90%
  const maxDf = Math.floor(n * 0.9);
  const vocab = new Map<string, number>();
  let idx = 0;
  for (const [term, count] of df) {
    if (count >= 2 && count <= maxDf) {
      vocab.set(term, idx++);
    }
  }

  // TF-IDF rows (sublinear TF: 1 + log(tf))
  const rows: Map<number, number>[] = [];
  const norms = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const tf = new Map<string, number>();
    for (const t of docTerms[i]) {
      if (vocab.has(t)) {
        tf.set(t, (tf.get(t) ?? 0) + 1);
      }
    }
    const row = new Map<number, number>();
    let norm = 0;
    for (const [term, count] of tf) {
      const termIdx = vocab.get(term)!;
      const idf = Math.log((n + 1) / ((df.get(term) ?? 0) + 1)) + 1;
      const tfidf = (1 + Math.log(count)) * idf;
      row.set(termIdx, tfidf);
      norm += tfidf * tfidf;
    }
    norm = Math.sqrt(norm);
    norms[i] = norm;
    rows.push(row);
  }

  return { vocab, rows, norms };
}

/**
 * Cosine similarity between one row and all others.
 */
export function cosineSimilarities(matrix: TfidfMatrix, queryIdx: number): Float32Array {
  const { rows, norms } = matrix;
  const queryRow = rows[queryIdx];
  const queryNorm = norms[queryIdx];
  const n = rows.length;
  const sims = new Float32Array(n);

  if (queryNorm === 0) return sims;

  for (let i = 0; i < n; i++) {
    const targetRow = rows[i];
    if (norms[i] === 0) continue;
    let dot = 0;
    for (const [termIdx, val] of queryRow) {
      const targetVal = targetRow.get(termIdx);
      if (targetVal !== undefined) dot += val * targetVal;
    }
    sims[i] = dot / (queryNorm * norms[i]);
  }

  return sims;
}

// ─── Recommendation engine ───────────────────────────────────────────────────

export interface RecommendParams {
  title: string;
  topK: number;
  minScore?: number;
  sameGenreOnly?: boolean;
  sameComposerOnly?: boolean;
  weights: FeatureWeights;
}

export function rowToOut(row: AnimeRow, simScore: number): AnimeOut {
  const genresRaw = row.genres ?? "";
  const themesRaw = row.themes ?? "";
  const genreSep = genresRaw.includes("|") ? "|" : ",";
  const themeSep = themesRaw.includes("|") ? "|" : ",";

  return {
    title: row.title ?? "",
    synopsis: row.synopsis ?? "",
    genres: genresRaw.split(genreSep).map((g) => g.trim()).filter(Boolean),
    themes: themesRaw.split(themeSep).map((t) => t.trim()).filter(Boolean),
    score: parseFloat(row.score) || 0,
    episodes: parseInt(row.episodes) || 0,
    aired: row.aired ?? "",
    studios: row.studios ?? "",
    composer: row.composer ?? "",
    mood: row.mood ?? "",
    artwork_url: row.artwork_url ?? "",
    similarity_score: Math.round(simScore * 10000) / 10000,
  };
}

export function recommend(
  df: AnimeRow[],
  matrix: TfidfMatrix,
  params: RecommendParams
): AnimeOut[] {
  const titleToIdx = new Map(df.map((r, i) => [r.title, i]));
  const idx = titleToIdx.get(params.title);
  if (idx === undefined) return [];

  const sims = cosineSimilarities(matrix, idx);
  sims[idx] = -1; // exclude self

  // build sorted candidate list
  const indices = Array.from({ length: df.length }, (_, i) => i);
  indices.sort((a, b) => sims[b] - sims[a]);

  const baseRow = df[idx];

  let results: AnimeOut[] = [];
  for (const i of indices) {
    if (results.length >= params.topK) break;
    const row = df[i];

    if (params.minScore !== undefined) {
      const s = parseFloat(row.score);
      if (!isNaN(s) && s < params.minScore) continue;
    }

    if (params.sameGenreOnly) {
      const baseGenres = new Set(
        (baseRow.genres ?? "").toLowerCase().split(",").map((g) => g.trim()).filter(Boolean)
      );
      const rowGenres = new Set(
        (row.genres ?? "").toLowerCase().split(",").map((g) => g.trim()).filter(Boolean)
      );
      const overlap = [...baseGenres].some((g) => rowGenres.has(g));
      if (!overlap) continue;
    }

    if (params.sameComposerOnly) {
      const baseComposer = (baseRow.composer ?? "").trim().toLowerCase();
      if (baseComposer && !((row.composer ?? "").toLowerCase().includes(baseComposer))) continue;
    }

    results.push(rowToOut(row, sims[i]));
  }

  return results;
}
