export interface Anime {
  title: string;
  title_english: string;
  title_japanese: string;
  synopsis: string;
  genres: string[];
  themes: string[];
  score: number;
  episodes: number;
  aired: string;
  studios: string;
  composer: string;
  mood: string;
  artwork_url: string;
}

export interface FeatureWeights {
  genres: number;
  themes: number;
  composer: number;
  mood: number;
  studio: number;
  synopsis: number;
}

export interface RecommendRequest {
  title: string;
  top_k: number;
  min_score?: number;
  same_genre_only?: boolean;
  same_composer_only?: boolean;
  feature_weights: FeatureWeights;
}

export interface RecommendResponse {
  recommendations: Array<Anime & { similarity_score: number }>;
}
