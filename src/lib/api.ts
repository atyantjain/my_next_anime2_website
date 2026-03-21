import { Anime, RecommendRequest, RecommendResponse } from "@/types/anime";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface TitleEntry {
  title: string;
  artwork_url: string;
}

export async function fetchTitles(): Promise<TitleEntry[]> {
  const res = await fetch(`${API_BASE_URL}/titles`);
  const data = await res.json();
  return data.titles;
}

export async function fetchAnimeDetails(title: string): Promise<Anime> {
  const res = await fetch(`${API_BASE_URL}/anime/${encodeURIComponent(title)}`);
  return res.json();
}

export async function fetchRecommendations(params: RecommendRequest): Promise<RecommendResponse> {
  const res = await fetch(`${API_BASE_URL}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}
