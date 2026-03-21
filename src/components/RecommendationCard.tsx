import { useState } from "react";
import { Anime } from "@/types/anime";
import { ChevronDown, Music } from "lucide-react";

interface Props {
  anime: Anime & { similarity_score: number };
  rank: number;
}

const RecommendationCard = ({ anime, rank }: Props) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="group rounded-xl transition-all hover:shadow-lg cursor-pointer"
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex gap-4 p-4">
        <div className="relative flex-shrink-0">
          <span className="absolute -top-2 -left-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
            {rank}
          </span>
          <img
            src={anime.artwork_url}
            alt={anime.title}
            className="w-32 h-44 object-cover rounded-lg shadow-md"
            loading="lazy"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-base leading-tight text-card-foreground">{anime.title}</h4>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary" title="Similarity score">
                Sim {anime.similarity_score.toFixed(3)}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
                ⭐ {anime.score}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1 transition-all duration-300">
            {anime.genres.map((g) => (
              <span key={g} className={`rounded-full font-medium bg-genre-bg text-genre-text transition-all duration-300 ${expanded ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}>{g}</span>
            ))}
            {anime.themes.map((t) => (
              <span key={t} className={`rounded-full font-medium bg-theme-bg text-theme-text transition-all duration-300 ${expanded ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}>{t}</span>
            ))}
          </div>
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${!expanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="text-xs text-muted-foreground mt-1">
              {anime.mood} · <Music className="w-3 h-3 inline-block align-middle" /> {anime.composer} · {anime.studios} · {anime.episodes}ep
            </div>
            <p className="text-sm text-card-foreground/70 leading-relaxed mt-2">
              {anime.synopsis.length > 150 ? anime.synopsis.slice(0, 150) + "…" : anime.synopsis}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><span className="text-muted-foreground">Mood:</span> {anime.mood}</div>
            <div className="flex items-center gap-1"><span className="text-muted-foreground">Composer:</span> <Music className="w-3.5 h-3.5" /> {anime.composer}</div>
            <div><span className="text-muted-foreground">Studio:</span> {anime.studios}</div>
            <div><span className="text-muted-foreground">Aired:</span> {anime.aired}</div>
            <div><span className="text-muted-foreground">Episodes:</span> {anime.episodes}</div>
            <div><span className="text-muted-foreground">Score:</span> ⭐ {anime.score}</div>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">Full Synopsis</p>
            <p className="text-sm text-card-foreground/80 leading-relaxed">{anime.synopsis}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;
