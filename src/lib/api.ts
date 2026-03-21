import { RecommendRequest, RecommendResponse } from "@/types/anime";
import { getMockRecommendations } from "@/data/mockAnime";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function fetchRecommendations(params: RecommendRequest): Promise<RecommendResponse> {
  if (API_BASE_URL) {
    const res = await fetch(`${API_BASE_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  }

  // Mock delay
  await new Promise((r) => setTimeout(r, 600));
  const recs = getMockRecommendations(
    params.title,
    params.top_k,
    params.min_score,
    params.same_genre_only,
    params.feature_weights
  );
  return { recommendations: recs };
}
