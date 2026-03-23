import { FeatureWeights } from "@/types/anime";

const FEATURES = [
  { key: "genres" as const, label: "Genres" },
  { key: "themes" as const, label: "Themes" },
  { key: "composer" as const, label: "Music" },
  { key: "mood" as const, label: "Mood" },
  { key: "studio" as const, label: "Studio" },
  { key: "synopsis" as const, label: "Story" },
];

const DEFAULT_WEIGHTS: FeatureWeights = {
  genres: 1, themes: 3, composer: 3, mood: 3, studio: 1, synopsis: 1,
};

interface Props {
  weights: FeatureWeights;
  useDefault: boolean;
  onToggleDefault: () => void;
  onToggleFeature: (key: keyof FeatureWeights) => void;
}

const FeatureWeightControls = ({ weights, useDefault, onToggleDefault, onToggleFeature }: Props) => {
  const activeWeights = useDefault ? DEFAULT_WEIGHTS : weights;

  return (
    <div className="bg-card/60 backdrop-blur-md border border-white/10 mx-auto max-w-3xl rounded-lg -mt-6 px-6 py-4 md:px-8 md:py-4 relative z-20 shadow-xl">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onToggleDefault}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            useDefault
              ? "bg-gradient-to-r from-white/25 via-slate-200/20 to-slate-400/25 text-white/85 border border-white/35 shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Default
        </button>
        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
        {FEATURES.map((f) => {
          const isHigh = activeWeights[f.key] >= 3;
          return (
            <button
              key={f.key}
              onClick={() => {
                if (useDefault) onToggleDefault();
                onToggleFeature(f.key);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 ${
                isHigh
                  ? "bg-gradient-to-r from-white/20 via-slate-200/15 to-slate-400/20 text-white/80 border border-white/30"
                  : "bg-muted text-muted-foreground border border-transparent"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground text-center">
        Click a feature to boost its influence on recommendations. Highlighted = high weight. Click again to lower it.
      </p>
    </div>
  );
};

export default FeatureWeightControls;
export { DEFAULT_WEIGHTS };
