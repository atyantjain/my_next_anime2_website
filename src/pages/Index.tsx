import { useState, useEffect, useRef } from "react";
import { Anime, FeatureWeights } from "@/types/anime";
import { fetchTitles, fetchAnimeDetails, TitleEntry } from "@/lib/api";
import { extractDominantColors } from "@/lib/colors";
import { useRecommendations } from "@/hooks/useRecommendations";
import HeroBanner from "@/components/HeroBanner";
import FeatureWeightControls, { DEFAULT_WEIGHTS } from "@/components/FeatureWeightControls";
import AnimeSearch from "@/components/AnimeSearch";
import SelectedAnimePanel from "@/components/SelectedAnimePanel";
import FilterControls from "@/components/FilterControls";
import RecommendationPanel from "@/components/RecommendationPanel";

const Index = () => {
  const [titles, setTitles] = useState<TitleEntry[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayGradient, setDisplayGradient] = useState<string>("");
  const [opacity, setOpacity] = useState(0);
  const [useDefault, setUseDefault] = useState(true);
  const [weights, setWeights] = useState<FeatureWeights>(DEFAULT_WEIGHTS);
  const [topK, setTopK] = useState(12);
  const [useMinScore, setUseMinScore] = useState(false);
  const [minScore, setMinScore] = useState(7.0);
  const [sameGenreOnly, setSameGenreOnly] = useState(false);
  const [sameComposerOnly, setSameComposerOnly] = useState(false);

  const { recommendations, loading, getRecommendations } = useRecommendations();
  // No sticky panel state

  const activeWeights = useDefault ? DEFAULT_WEIGHTS : weights;

  // No sticky panel effect

  // Load all titles from backend on mount + default select One Piece
  useEffect(() => {
    fetchTitles().then((t) => {
      setTitles(t);
      fetchAnimeDetails("One Piece").then(setSelectedAnime).catch(console.error);
    }).catch(console.error);
  }, []);

  // Extract dominant colors when a new anime is selected
  useEffect(() => {
    if (selectedAnime?.artwork_url) {
      // Fade out first
      setOpacity(0);
      extractDominantColors(selectedAnime.artwork_url).then((colors) => {
        const newGradient = `linear-gradient(135deg, ${colors[0]}30, ${colors[1]}30, ${colors[2]}30)`;
        // Wait for fade-out, then swap gradient and fade in
        setTimeout(() => {
          setDisplayGradient(newGradient);
          requestAnimationFrame(() => setOpacity(1));
        }, 500);
      });
    } else {
      setOpacity(0);
      setTimeout(() => setDisplayGradient(""), 500);
    }
  }, [selectedAnime]);

  // Fetch recommendations whenever selection or params change
  useEffect(() => {
    if (selectedAnime) {
      getRecommendations(
        selectedAnime.title,
        topK,
        activeWeights,
        useMinScore ? minScore : undefined,
        sameGenreOnly,
        sameComposerOnly
      );
    }
  }, [selectedAnime, topK, activeWeights, useMinScore, minScore, sameGenreOnly, sameComposerOnly]);

  const handleToggleFeature = (key: keyof FeatureWeights) => {
    setWeights((prev) => ({ ...prev, [key]: prev[key] >= 3 ? 1 : 3 }));
  };

  return (
    <div className="min-h-screen relative">
      {/* Animated background gradient */}
      <div
        className="fixed inset-0 -z-10 transition-opacity duration-700 ease-in-out"
        style={{
          background: displayGradient || undefined,
          opacity,
        }}
      />
      <HeroBanner />
      <div className="mb-4">
        <FeatureWeightControls
          weights={weights}
          useDefault={useDefault}
          onToggleDefault={() => setUseDefault((p) => !p)}
          onToggleFeature={handleToggleFeature}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-8 mt-2">
        {/* Left Panel */}
        <div className="space-y-3">
          <div className="sticky top-[72px] z-20 space-y-3">
            <h2 className="text-xl font-bold text-foreground">Pick an anime you like</h2>
            <AnimeSearch
              titles={titles}
              query={searchQuery}
              setQuery={setSearchQuery}
              onSelect={async (title) => {
                const details = await fetchAnimeDetails(title);
                setSelectedAnime(details);
                setSearchQuery("");
              }}
            />
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <SelectedAnimePanel anime={selectedAnime} />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">The Next to Watch</h2>
          <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-sm">
              <FilterControls
              topK={topK}
              onTopKChange={setTopK}
              useMinScore={useMinScore}
              onUseMinScoreChange={setUseMinScore}
              minScore={minScore}
              onMinScoreChange={setMinScore}
              sameGenreOnly={sameGenreOnly}
              onSameGenreChange={setSameGenreOnly}
              sameComposerOnly={sameComposerOnly}
              onSameComposerChange={setSameComposerOnly}
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
