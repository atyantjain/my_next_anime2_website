import { useState, useEffect } from "react";
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

const JP_CHARS = [
  { char: '花', top: '8%',  left: '5%',  size: '1.8rem', anim: 'float1', dur: '7s',  opacity: 0.12 },
  { char: '月', top: '20%', left: '12%', size: '2.5rem', anim: 'float2', dur: '9s',  opacity: 0.09 },
  { char: '夢', top: '55%', left: '20%', size: '2rem',   anim: 'float3', dur: '6s',  opacity: 0.11 },
  { char: '剣', top: '35%', left: '30%', size: '3rem',   anim: 'float1', dur: '8s',  opacity: 0.07 },
  { char: '愛', top: '75%', left: '40%', size: '1.6rem', anim: 'float4', dur: '10s', opacity: 0.13 },
  { char: '竜', top: '15%', left: '50%', size: '2.8rem', anim: 'float2', dur: '7s',  opacity: 0.08 },
  { char: '神', top: '60%', left: '60%', size: '2.2rem', anim: 'float3', dur: '9s',  opacity: 0.10 },
  { char: '魔', top: '42%', left: '68%', size: '1.9rem', anim: 'float1', dur: '6s',  opacity: 0.12 },
  { char: '侍', top: '80%', left: '75%', size: '2.6rem', anim: 'float4', dur: '8s',  opacity: 0.08 },
  { char: '道', top: '28%', left: '82%', size: '2rem',   anim: 'float2', dur: '10s', opacity: 0.11 },
  { char: '天', top: '65%', left: '90%', size: '2.4rem', anim: 'float3', dur: '7s',  opacity: 0.09 },
  { char: '心', top: '48%', left: '8%',  size: '2.1rem', anim: 'float4', dur: '9s',  opacity: 0.10 },
  { char: '力', top: '88%', left: '35%', size: '1.7rem', anim: 'float1', dur: '6s',  opacity: 0.14 },
  { char: '星', top: '5%',  left: '55%', size: '2.3rem', anim: 'float2', dur: '8s',  opacity: 0.09 },
  { char: '風', top: '70%', left: '72%', size: '1.5rem', anim: 'float3', dur: '7s',  opacity: 0.13 },
  { char: '鬼', top: '32%', left: '88%', size: '2.7rem', anim: 'float4', dur: '9s',  opacity: 0.07 },
  { char: '光', top: '92%', left: '25%', size: '1.6rem', anim: 'float1', dur: '10s', opacity: 0.11 },
  { char: '武', top: '18%', left: '45%', size: '2.2rem', anim: 'float2', dur: '6s',  opacity: 0.09 },
  { char: '命', top: '52%', left: '63%', size: '1.8rem', anim: 'float3', dur: '8s',  opacity: 0.12 },
  { char: '気', top: '10%', left: '95%', size: '2rem',   anim: 'float4', dur: '7s',  opacity: 0.10 },
];

const Index = () => {
  const [titles, setTitles] = useState<TitleEntry[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradients, setGradients] = useState({ A: "", B: "" });
  const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A');
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

  // Extract dominant colors when a new anime is selected — true crossfade via two layers
  useEffect(() => {
    if (selectedAnime?.artwork_url) {
      extractDominantColors(selectedAnime.artwork_url).then((colors) => {
        const newGradient = `linear-gradient(135deg, ${colors[0]}50, ${colors[1]}50, ${colors[2]}50)`;
        setActiveLayer((prev) => {
          const next = prev === 'A' ? 'B' : 'A';
          setGradients((g) => ({ ...g, [next]: newGradient }));
          return next;
        });
      });
    } else {
      setGradients({ A: "", B: "" });
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
      {/* Animated background gradient — dual-layer crossfade */}
      <div
        className="fixed inset-0 -z-10"
        style={{ background: gradients.A || undefined, opacity: activeLayer === 'A' ? 1 : 0, transition: 'opacity 10s ease-in-out' }}
      />
      <div
        className="fixed inset-0 -z-10"
        style={{ background: gradients.B || undefined, opacity: activeLayer === 'B' ? 1 : 0, transition: 'opacity 10s ease-in-out' }}
      />

      {/* Floating Japanese characters */}
      <div className="fixed inset-0 -z-[5] pointer-events-none overflow-hidden">
        {JP_CHARS.map(({ char, top, left, size, anim, dur, opacity: op }) => (
          <span
            key={char + left}
            style={{
              position: 'absolute',
              top,
              left,
              fontSize: size,
              opacity: op,
              color: 'white',
              fontFamily: 'serif',
              animation: `${anim} ${dur} ease-in-out infinite`,
            }}
          >
            {char}
          </span>
        ))}
      </div>
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
            <div className="bg-card/60 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-xl">
              <SelectedAnimePanel anime={selectedAnime} />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">The Next to Watch</h2>
          <div className="bg-card/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-xl">
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
          <div className="bg-card/60 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-xl">
            <RecommendationPanel recommendations={recommendations} loading={loading} selectedTitle={selectedAnime?.title_english || selectedAnime?.title} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
