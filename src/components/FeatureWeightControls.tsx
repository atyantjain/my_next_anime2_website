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
  genres: 3, themes: 2, composer: 3, mood: 3, studio: 1, synopsis: 2,
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
    <div className="bg-card border border-border rounded-lg p-4 md:p-6 mx-4 md:mx-8 -mt-6 relative z-20 shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onToggleDefault}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
            useDefault
              ? "bg-primary text-primary-foreground shadow-md"
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
              onClick={() => !useDefault && onToggleFeature(f.key)}
              disabled={useDefault}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isHigh
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground border border-transparent"
              } ${useDefault ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Active weights — {FEATURES.map((f) => `${f.label}: ${activeWeights[f.key]}`).join(" · ")}
      </p>
    </div>
  );
};

export default FeatureWeightControls;
export { DEFAULT_WEIGHTS };
