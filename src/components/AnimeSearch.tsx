import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";

interface TitleEntry {
  title: string;
  artwork_url: string;
}

interface Props {
  titles: TitleEntry[];
  query?: string;
  setQuery?: (q: string) => void;
  onSelect: (title: string) => void;
}


const AnimeSearch = ({ titles, onSelect, query: controlledQuery, setQuery: setControlledQuery }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isControlled = controlledQuery !== undefined && setControlledQuery !== undefined;
  const [uncontrolledQuery, setUncontrolledQuery] = useState("");
  const query = isControlled ? controlledQuery : uncontrolledQuery;
  const setQuery = isControlled ? setControlledQuery : setUncontrolledQuery;

  const filtered = query
    ? titles.filter((t) => t.title.toLowerCase().includes(query.toLowerCase())).slice(0, 50)
    : titles.slice(0, 50);

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
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {filtered.map((entry) => (
            <button
              key={entry.title}
              className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-muted transition-colors"
              onClick={() => { onSelect(entry.title); setOpen(false); }}
            >
              {entry.artwork_url && (
                <img
                  src={entry.artwork_url}
                  alt={entry.title}
                  className="w-8 h-11 object-cover rounded flex-shrink-0"
                  loading="lazy"
                />
              )}
              <span className="font-medium text-sm">{entry.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnimeSearch;
