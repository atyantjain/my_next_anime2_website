import { Anime } from "@/types/anime";
import { Music } from "lucide-react";

const SelectedAnimePanel = ({ anime }: { anime: Anime | null }) => {
  if (!anime) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm italic">
        Select an anime to see details
      </div>
    );
  }

  return (
    <div key={anime.title} className="space-y-4" style={{ animation: 'fadeSlideIn 0.6s ease-out' }}>
      <div className="flex gap-4">
        <img
          src={anime.artwork_url}
          alt={anime.title}
          className="w-32 h-44 object-cover rounded-lg shadow-md flex-shrink-0"
          loading="lazy"
        />
        <div className="space-y-1.5 min-w-0">
          <h3 className="text-lg font-bold leading-tight bg-gradient-to-br from-white via-slate-300 to-slate-500 bg-clip-text text-transparent">{anime.title_english || anime.title}</h3>
          {anime.title_japanese && (
            <p className="text-sm text-muted-foreground">{anime.title_japanese}</p>
          )}
          <p className="text-sm">⭐ <span className="font-semibold">{anime.score}</span> / 10</p>
          <p className="text-sm text-muted-foreground">{anime.episodes} episodes</p>
          <p className="text-sm text-muted-foreground">{anime.aired}</p>
          <p className="text-sm text-muted-foreground">{anime.studios}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1"><Music className="w-3.5 h-3.5" /> {anime.composer}</p>
          <p className="text-sm text-muted-foreground">Mood: {anime.mood}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {anime.genres.map((g) => (
          <span key={g} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-genre-bg text-genre-text">
            {g}
          </span>
        ))}
        {anime.themes.map((t) => (
          <span key={t} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-theme-bg text-theme-text">
            {t}
          </span>
        ))}
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-sm leading-relaxed text-card-foreground/90">{anime.synopsis}</p>
      </div>
    </div>
  );
};

export default SelectedAnimePanel;
