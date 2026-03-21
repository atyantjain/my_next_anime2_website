import { Anime } from "@/types/anime";

interface Props {
  anime: Anime & { similarity_score: number };
  rank: number;
}

const RecommendationCard = ({ anime, rank }: Props) => (
  <div className="group flex gap-3 p-3 rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-md bg-card">
    <span className="text-2xl font-extrabold text-muted-foreground/30 w-8 flex-shrink-0 pt-1">
      {rank}
    </span>
    <img
      src={anime.artwork_url}
      alt={anime.title}
      className="w-16 h-22 object-cover rounded-md shadow-sm flex-shrink-0"
      loading="lazy"
    />
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-sm leading-tight text-card-foreground">{anime.title}</h4>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
          {anime.similarity_score.toFixed(3)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {anime.genres.map((g) => (
          <span key={g} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-genre-bg text-genre-text">{g}</span>
        ))}
        {anime.themes.map((t) => (
          <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-theme-bg text-theme-text">{t}</span>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        {anime.mood} · 🎵 {anime.composer} · {anime.studios} · ⭐ {anime.score} · {anime.episodes}ep
      </div>
      <p className="text-xs text-card-foreground/70 leading-relaxed">
        {anime.synopsis.length > 200 ? anime.synopsis.slice(0, 200) + "…" : anime.synopsis}
      </p>
    </div>
  </div>
);

export default RecommendationCard;
