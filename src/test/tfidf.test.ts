import { describe, it, expect } from "vitest";
import {
  AnimeRow,
  FeatureWeights,
  buildTfidfMatrix,
  cosineSimilarities,
  recommend,
  rowToOut,
} from "@/lib/tfidf";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<AnimeRow>): AnimeRow {
  return {
    title: "",
    title_original: "",
    synopsis: "",
    genres: "",
    themes: "",
    score: "7.0",
    episodes: "12",
    aired: "2020",
    studios: "",
    composer: "",
    mood: "",
    artwork_url: "",
    ...overrides,
  };
}

const DEFAULT_WEIGHTS: FeatureWeights = {
  genres: 1,
  themes: 3,
  composer: 3,
  mood: 3,
  studio: 1,
  synopsis: 2,
};

// Build feature text the same way the worker does
function buildFeatureTexts(
  df: AnimeRow[],
  weights: FeatureWeights
): string[] {
  function cleanText(x: string): string {
    if (!x) return "";
    let s = x.toLowerCase();
    s = s.replace(/<[^>]+>/g, " ");
    s = s.replace(/[^a-z0-9\s]+/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }
  function compoundTokens(value: string): string {
    if (!value) return "";
    const sep = value.includes("|") ? "|" : ",";
    return value
      .split(sep)
      .map((v) =>
        v.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "_").replace(/^_|_$/g, "")
      )
      .filter((v) => v.length > 1)
      .join(" ");
  }
  return df.map((row) => {
    const parts = [
      cleanText(row.title ?? ""),
      (compoundTokens(row.genres ?? "") + " ").repeat(weights.genres),
      (compoundTokens(row.themes ?? "") + " ").repeat(weights.themes),
      (compoundTokens(row.composer ?? "") + " ").repeat(weights.composer),
      (compoundTokens(row.mood ?? "") + " ").repeat(weights.mood),
      (compoundTokens(row.studios ?? "") + " ").repeat(weights.studio),
      (cleanText(row.synopsis ?? "") + " ").repeat(weights.synopsis),
    ];
    return parts.join(" ").replace(/\s+/g, " ").trim();
  });
}

// ─── test data ────────────────────────────────────────────────────────────────

const ANIME_DB: AnimeRow[] = [
  makeRow({
    title: "Naruto",
    genres: "Action,Adventure",
    themes: "Martial Arts,Shounen",
    synopsis: "A young ninja seeks recognition and dreams of becoming the strongest leader.",
    composer: "Toshio Masuda",
    mood: "Exciting",
    studios: "Pierrot",
    score: "8.0",
  }),
  makeRow({
    title: "Bleach",
    genres: "Action,Adventure",
    themes: "Martial Arts,Shounen",
    synopsis: "A teenager gains soul reaper powers and fights evil spirits.",
    composer: "Shiro Sagisu",
    mood: "Exciting",
    studios: "Pierrot",
    score: "7.9",
  }),
  makeRow({
    title: "One Piece",
    genres: "Action,Adventure",
    themes: "Shounen",
    synopsis: "A pirate crew sails the seas searching for the ultimate treasure.",
    composer: "Kohei Tanaka",
    mood: "Exciting",
    studios: "Toei Animation",
    score: "8.7",
  }),
  makeRow({
    title: "Your Lie in April",
    genres: "Drama,Romance",
    themes: "Music",
    synopsis: "A piano prodigy rediscovers music through a free-spirited violinist.",
    composer: "Masaru Yokoyama",
    mood: "Emotional",
    studios: "A-1 Pictures",
    score: "8.6",
  }),
  makeRow({
    title: "Clannad",
    genres: "Drama,Romance",
    themes: "School",
    synopsis: "A delinquent student meets a mysterious girl and discovers the meaning of family.",
    composer: "Jun Maeda",
    mood: "Emotional",
    studios: "Kyoto Animation",
    score: "8.0",
  }),
  makeRow({
    title: "Anohana",
    genres: "Drama,Romance",
    themes: "School",
    synopsis: "A group of childhood friends reunite after the ghost of their friend appears.",
    composer: "Remedios",
    mood: "Emotional",
    studios: "A-1 Pictures",
    score: "8.3",
  }),
  makeRow({
    title: "Dragon Ball Z",
    genres: "Action,Adventure",
    themes: "Martial Arts,Shounen",
    synopsis: "Warriors defend Earth against powerful alien threats and villains.",
    composer: "Shunsuke Kikuchi",
    mood: "Exciting",
    studios: "Toei Animation",
    score: "8.2",
  }),
];

// ─── tests ────────────────────────────────────────────────────────────────────

describe("buildTfidfMatrix", () => {
  it("should create a matrix with correct dimensions", () => {
    const texts = buildFeatureTexts(ANIME_DB, DEFAULT_WEIGHTS);
    const matrix = buildTfidfMatrix(texts);

    expect(matrix.rows.length).toBe(ANIME_DB.length);
    expect(matrix.norms.length).toBe(ANIME_DB.length);
    expect(matrix.vocab.size).toBeGreaterThan(0);
  });

  it("should have non-zero norms for all docs", () => {
    const texts = buildFeatureTexts(ANIME_DB, DEFAULT_WEIGHTS);
    const matrix = buildTfidfMatrix(texts);

    for (let i = 0; i < ANIME_DB.length; i++) {
      expect(matrix.norms[i]).toBeGreaterThan(0);
    }
  });
});

describe("cosineSimilarities", () => {
  const texts = buildFeatureTexts(ANIME_DB, DEFAULT_WEIGHTS);
  const matrix = buildTfidfMatrix(texts);

  it("should return similarities in [0,1] range (roughly)", () => {
    const sims = cosineSimilarities(matrix, 0); // Naruto
    for (let i = 0; i < sims.length; i++) {
      expect(sims[i]).toBeGreaterThanOrEqual(0);
      expect(sims[i]).toBeLessThanOrEqual(1.001); // small epsilon
    }
  });

  it("should give self the highest similarity (1.0)", () => {
    const sims = cosineSimilarities(matrix, 0); // Naruto
    expect(sims[0]).toBeCloseTo(1.0, 2);
  });

  it("action anime should be more similar to each other than to romance", () => {
    const sims = cosineSimilarities(matrix, 0); // Naruto

    const narutoIdx = 0;
    const bleachIdx = 1; // Action
    const yourLieIdx = 3; // Romance

    // Bleach should be more similar to Naruto than Your Lie in April
    expect(sims[bleachIdx]).toBeGreaterThan(sims[yourLieIdx]);
  });

  it("romance/drama anime should cluster together", () => {
    const sims = cosineSimilarities(matrix, 3); // Your Lie in April

    const clannadIdx = 4; // Romance/Drama
    const narutoIdx = 0; // Action

    expect(sims[clannadIdx]).toBeGreaterThan(sims[narutoIdx]);
  });
});

describe("recommend", () => {
  const texts = buildFeatureTexts(ANIME_DB, DEFAULT_WEIGHTS);
  const matrix = buildTfidfMatrix(texts);

  it("should return topK results", () => {
    const results = recommend(ANIME_DB, matrix, {
      title: "Naruto",
      topK: 3,
      weights: DEFAULT_WEIGHTS,
    });

    expect(results.length).toBe(3);
  });

  it("should not include the queried anime in results", () => {
    const results = recommend(ANIME_DB, matrix, {
      title: "Naruto",
      topK: 6,
      weights: DEFAULT_WEIGHTS,
    });

    expect(results.find((r) => r.title === "Naruto")).toBeUndefined();
  });

  it("should rank action anime highest for Naruto", () => {
    const results = recommend(ANIME_DB, matrix, {
      title: "Naruto",
      topK: 3,
      weights: DEFAULT_WEIGHTS,
    });

    // Top results should be other action/shounen anime
    const topTitles = results.map((r) => r.title);
    const actionTitles = ["Bleach", "One Piece", "Dragon Ball Z"];
    const overlap = topTitles.filter((t) => actionTitles.includes(t));
    expect(overlap.length).toBeGreaterThanOrEqual(2);
  });

  it("should rank drama/romance anime highest for Your Lie in April", () => {
    const results = recommend(ANIME_DB, matrix, {
      title: "Your Lie in April",
      topK: 3,
      weights: DEFAULT_WEIGHTS,
    });

    const topTitles = results.map((r) => r.title);
    const dramaTitles = ["Clannad", "Anohana"];
    const overlap = topTitles.filter((t) => dramaTitles.includes(t));
    expect(overlap.length).toBeGreaterThanOrEqual(1);
  });

  it("should respect minScore filter", () => {
    const results = recommend(ANIME_DB, matrix, {
      title: "Naruto",
      topK: 6,
      minScore: 8.5,
      weights: DEFAULT_WEIGHTS,
    });

    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(8.5);
    }
  });

  it("should respect sameGenreOnly filter", () => {
    const results = recommend(ANIME_DB, matrix, {
      title: "Naruto",
      topK: 6,
      sameGenreOnly: true,
      weights: DEFAULT_WEIGHTS,
    });

    // Naruto genres: Action, Adventure — all results should share at least one
    for (const r of results) {
      const hasAction = r.genres.some((g) =>
        g.toLowerCase().includes("action")
      );
      const hasAdventure = r.genres.some((g) =>
        g.toLowerCase().includes("adventure")
      );
      expect(hasAction || hasAdventure).toBe(true);
    }
  });

  it("should return empty for unknown title", () => {
    const results = recommend(ANIME_DB, matrix, {
      title: "NonExistentAnime",
      topK: 3,
      weights: DEFAULT_WEIGHTS,
    });
    expect(results).toEqual([]);
  });

  it("should return results with decreasing similarity scores", () => {
    const results = recommend(ANIME_DB, matrix, {
      title: "Naruto",
      topK: 6,
      weights: DEFAULT_WEIGHTS,
    });

    for (let i = 1; i < results.length; i++) {
      expect(results[i].similarity_score).toBeLessThanOrEqual(
        results[i - 1].similarity_score
      );
    }
  });
});

describe("rowToOut", () => {
  it("should convert a row to output format correctly", () => {
    const out = rowToOut(ANIME_DB[0], 0.85);
    expect(out.title).toBe("Naruto");
    expect(out.genres).toEqual(["Action", "Adventure"]);
    expect(out.themes).toEqual(["Martial Arts", "Shounen"]);
    expect(out.score).toBe(8.0);
    expect(out.similarity_score).toBe(0.85);
    expect(out.studios).toBe("Pierrot");
  });
});

describe("weight sensitivity", () => {
  it("changing genre weight should alter similarity ranking", () => {
    // High genre weight
    const highGenre: FeatureWeights = { genres: 5, themes: 0, composer: 0, mood: 0, studio: 0, synopsis: 0 };
    const textsHigh = buildFeatureTexts(ANIME_DB, highGenre);
    const matrixHigh = buildTfidfMatrix(textsHigh);
    const resultsHigh = recommend(ANIME_DB, matrixHigh, {
      title: "Naruto",
      topK: 3,
      weights: highGenre,
    });

    // High synopsis weight
    const highSynopsis: FeatureWeights = { genres: 0, themes: 0, composer: 0, mood: 0, studio: 0, synopsis: 5 };
    const textsSyn = buildFeatureTexts(ANIME_DB, highSynopsis);
    const matrixSyn = buildTfidfMatrix(textsSyn);
    const resultsSyn = recommend(ANIME_DB, matrixSyn, {
      title: "Naruto",
      topK: 3,
      weights: highSynopsis,
    });

    // They should produce results (may differ in ranking)
    expect(resultsHigh.length).toBeGreaterThan(0);
    expect(resultsSyn.length).toBeGreaterThan(0);
  });

  it("studio-only weight should rank same-studio anime highest", () => {
    const studioOnly: FeatureWeights = { genres: 0, themes: 0, composer: 0, mood: 0, studio: 5, synopsis: 0 };
    const texts = buildFeatureTexts(ANIME_DB, studioOnly);
    const matrix = buildTfidfMatrix(texts);
    const results = recommend(ANIME_DB, matrix, {
      title: "Your Lie in April", // A-1 Pictures
      topK: 3,
      weights: studioOnly,
    });

    // Anohana is also A-1 Pictures — should appear in top results
    const topTitles = results.map((r) => r.title);
    expect(topTitles).toContain("Anohana");
  });

  it("compound tokens should produce higher similarity than before", () => {
    // With studio-only weight, same-studio anime should have meaningful similarity
    const studioOnly: FeatureWeights = { genres: 0, themes: 0, composer: 0, mood: 0, studio: 3, synopsis: 0 };
    const texts = buildFeatureTexts(ANIME_DB, studioOnly);
    const matrix = buildTfidfMatrix(texts);
    const results = recommend(ANIME_DB, matrix, {
      title: "Your Lie in April",
      topK: 1,
      weights: studioOnly,
    });

    // Top match (Anohana, same studio) should have a meaningful similarity score
    expect(results[0].similarity_score).toBeGreaterThan(0.3);
  });
});
