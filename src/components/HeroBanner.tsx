const DECO_CHARS = ["変", "態", "ア", "ニ", "メ", "推", "漫", "画", "オ", "タ", "ク", "愛"];

const HeroBanner = () => (
  <div className="relative overflow-hidden min-h-[120px] flex items-center justify-center text-center">
    {/* Floating Japanese characters */}
    <div className="absolute inset-0 pointer-events-none z-[1]">
      {DECO_CHARS.map((ch, i) => (
        <span
          key={i}
          className="absolute text-foreground/20 text-2xl"
          style={{
            top: `${10 + (i * 7) % 80}%`,
            left: `${5 + (i * 11) % 90}%`,
            animation: `float${(i % 4) + 1} ${5 + (i % 5)}s ease-in-out infinite`,
          }}
        >
          {ch}
        </span>
      ))}
    </div>
    {/* Title */}
    <div className="relative z-[2] py-8 px-6 w-full">
      <h1
        className="font-black text-foreground uppercase w-full"
        style={{
          fontFamily: "'Zenkaku Gothic New', 'Hiragino Kaku Gothic Pro', sans-serif",
          fontSize: "8vw",
          letterSpacing: "0.15em",
          lineHeight: 1,
        }}
      >
        My Next Anime
      </h1>
      <p className="mt-1.5 text-sm md:text-base font-light text-muted-foreground italic">
        Discover your next obsession
      </p>
    </div>
  </div>
);

export default HeroBanner;
