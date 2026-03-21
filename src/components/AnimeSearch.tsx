import { useState, useRef, useEffect } from "react";
import { Anime } from "@/types/anime";
import { Search } from "lucide-react";

interface Props {
  animeList: Anime[];
  onSelect: (anime: Anime) => void;
}

const AnimeSearch = ({ animeList, onSelect }: Props) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query
    ? animeList.filter((a) => a.title.toLowerCase().includes(query.toLowerCase()))
    : animeList;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search anime titles…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {filtered.map((a) => (
            <button
              key={a.title}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
              onClick={() => { onSelect(a); setQuery(a.title); setOpen(false); }}
            >
              <span className="font-medium">{a.title}</span>
              <span className="ml-2 text-muted-foreground">⭐ {a.score}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnimeSearch;
