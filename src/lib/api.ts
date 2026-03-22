/**
 * Public API surface — now backed by the in-browser TF-IDF engine instead of
 * a remote FastAPI server. Drop-in replacement for the old fetch-based api.ts.
 */

import { Anime, RecommendRequest, RecommendResponse } from "@/types/anime";
import { engine, TitleEntry } from "@/lib/engine";

export type { TitleEntry };

export async function fetchTitles(): Promise<TitleEntry[]> {
  return engine.init();
}

export async function fetchAnimeDetails(title: string): Promise<Anime> {
  await engine.init();
  const out = await engine.getAnime(title);
  if (!out) throw new Error(`Anime not found: ${title}`);
  // AnimeOut is fully compatible with Anime (similarity_score is extra, harmless)
  return out as unknown as Anime;
}

export async function fetchRecommendations(params: RecommendRequest): Promise<RecommendResponse> {
  await engine.init();
  const results = await engine.recommend({
    title: params.title,
    topK: params.top_k,
    minScore: params.min_score,
    sameGenreOnly: params.same_genre_only,
    sameComposerOnly: params.same_composer_only,
    weights: params.feature_weights,
  });
  return { recommendations: results as RecommendResponse["recommendations"] };
}
