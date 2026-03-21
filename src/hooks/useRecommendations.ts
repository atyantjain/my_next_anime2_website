import { useState, useCallback } from "react";
import { fetchRecommendations } from "@/lib/api";
import { Anime, FeatureWeights } from "@/types/anime";

type RecommendedAnime = Anime & { similarity_score: number };

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<RecommendedAnime[]>([]);
  const [loading, setLoading] = useState(false);

  const getRecommendations = useCallback(
    async (
      title: string,
      topK: number,
      weights: FeatureWeights,
      minScore?: number,
      sameGenreOnly?: boolean
    ) => {
      setLoading(true);
      try {
        const res = await fetchRecommendations({
          title,
          top_k: topK,
          min_score: minScore,
          same_genre_only: sameGenreOnly,
          feature_weights: weights,
        });
        setRecommendations(res.recommendations);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { recommendations, loading, getRecommendations };
}
