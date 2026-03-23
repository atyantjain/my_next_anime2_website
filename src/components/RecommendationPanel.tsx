import { useState } from "react";
import { Anime } from "@/types/anime";
import RecommendationCard from "./RecommendationCard";

interface Props {
  recommendations: Array<Anime & { similarity_score: number }>;
  loading: boolean;
  selectedTitle?: string;
}

const SkeletonCard = () => (
  <div className="flex gap-3 p-3 animate-pulse">
    <div className="w-8 h-6 bg-muted rounded" />
    <div className="w-16 h-22 bg-muted rounded-md" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-3 bg-muted rounded w-full" />
    </div>
  </div>
);

const RecommendationPanel = ({ recommendations, loading, selectedTitle }: Props) => {
  const [hideSameTitle, setHideSameTitle] = useState(true);

  // Filter out results whose title starts with the same base as the selected anime
  const baseTitle = selectedTitle?.split(":")[0].trim().toLowerCase() ?? "";
  const visible = hideSameTitle && baseTitle
    ? recommendations.filter((r) => {
        const t = (r.title_english || r.title).toLowerCase();
        return !t.startsWith(baseTitle);
      })
    : recommendations;

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm italic">
        Pick an anime to get recommendations
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedTitle && (
        <div className="flex items-center gap-2 pb-1">
          <button
            onClick={() => setHideSameTitle((p) => !p)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              hideSameTitle ? "bg-gradient-to-r from-white/55 via-slate-200/45 to-slate-400/50" : "bg-muted-foreground/30"
            }`}
            role="switch"
            aria-checked={hideSameTitle}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                hideSameTitle ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-xs text-muted-foreground">
            Hide same franchise as <span className="font-medium text-foreground">{selectedTitle}</span>
          </span>
        </div>
      )}
      <div key={visible[0]?.title ?? 'empty'} className="space-y-2 max-h-[800px] overflow-y-auto pr-1">
        {visible.map((rec, i) => (
          <RecommendationCard key={rec.title} anime={rec} rank={i + 1} index={i} />
        ))}
        {visible.length === 0 && (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm italic">
            No results after filtering
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationPanel;
