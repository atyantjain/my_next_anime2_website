import { useState, useEffect } from "react";
import { Anime, FeatureWeights } from "@/types/anime";
import { animeList } from "@/data/mockAnime";
import { useRecommendations } from "@/hooks/useRecommendations";
import HeroBanner from "@/components/HeroBanner";
import FeatureWeightControls, { DEFAULT_WEIGHTS } from "@/components/FeatureWeightControls";
import AnimeSearch from "@/components/AnimeSearch";
import SelectedAnimePanel from "@/components/SelectedAnimePanel";
import FilterControls from "@/components/FilterControls";
import RecommendationPanel from "@/components/RecommendationPanel";

const Index = () => {
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [useDefault, setUseDefault] = useState(true);
  const [weights, setWeights] = useState<FeatureWeights>(DEFAULT_WEIGHTS);
  const [topK, setTopK] = useState(12);
  const [useMinScore, setUseMinScore] = useState(false);
  const [minScore, setMinScore] = useState(7.0);
  const [sameGenreOnly, setSameGenreOnly] = useState(false);

  const { recommendations, loading, getRecommendations } = useRecommendations();

  const activeWeights = useDefault ? DEFAULT_WEIGHTS : weights;

  useEffect(() => {
    if (selectedAnime) {
      getRecommendations(
        selectedAnime.title,
        topK,
        activeWeights,
        useMinScore ? minScore : undefined,
        sameGenreOnly
      );
    }
  }, [selectedAnime, topK, activeWeights, useMinScore, minScore, sameGenreOnly]);

  const handleToggleFeature = (key: keyof FeatureWeights) => {
    setWeights((prev) => ({ ...prev, [key]: prev[key] >= 3 ? 1 : 3 }));
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroBanner />
      <FeatureWeightControls
        weights={weights}
        useDefault={useDefault}
        onToggleDefault={() => setUseDefault((p) => !p)}
        onToggleFeature={handleToggleFeature}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 md:p-8 mt-4">
        {/* Left Panel */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Pick an anime you like</h2>
          <AnimeSearch animeList={animeList} onSelect={setSelectedAnime} />
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <SelectedAnimePanel anime={selectedAnime} />
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">The Next to Watch</h2>
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <FilterControls
              topK={topK}
              onTopKChange={setTopK}
              useMinScore={useMinScore}
              onUseMinScoreChange={setUseMinScore}
              minScore={minScore}
              onMinScoreChange={setMinScore}
              sameGenreOnly={sameGenreOnly}
              onSameGenreChange={setSameGenreOnly}
            />
          </div>
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <RecommendationPanel recommendations={recommendations} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
