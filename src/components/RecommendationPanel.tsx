import { Anime } from "@/types/anime";
import RecommendationCard from "./RecommendationCard";

interface Props {
  recommendations: Array<Anime & { similarity_score: number }>;
  loading: boolean;
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

const RecommendationPanel = ({ recommendations, loading }: Props) => {
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
    <div className="space-y-2 max-h-[800px] overflow-y-auto pr-1">
      {recommendations.map((rec, i) => (
        <RecommendationCard key={rec.title} anime={rec} rank={i + 1} />
      ))}
    </div>
  );
};

export default RecommendationPanel;
