const HeroBanner = () => (
  <div className="relative overflow-hidden bg-gradient-to-br from-primary to-accent py-16 px-6 text-center">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--gradient-start)/0.3),_transparent_60%)]" />
    <div className="relative z-10">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-primary-foreground uppercase">
        My Next Anime
      </h1>
      <p className="mt-3 text-lg md:text-xl font-light text-primary-foreground/80 italic">
        Discover your next obsession
      </p>
    </div>
  </div>
);

export default HeroBanner;
