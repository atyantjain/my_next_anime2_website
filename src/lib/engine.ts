/**
 * Main-thread interface to the recommender Web Worker.
 * Provides promise-based methods that mirror the old FastAPI endpoints.
 */

import { AnimeOut, FeatureWeights, RecommendParams } from "@/lib/tfidf";

export interface TitleEntry {
  title: string;
  artwork_url: string;
}

type WorkerMessage =
  | { type: "READY"; payload: { titles: TitleEntry[] } }
  | { type: "RECOMMEND_RESULT"; payload: AnimeOut[] }
  | { type: "ANIME_RESULT"; payload: AnimeOut | null }
  | { type: "ERROR"; payload: string };

class RecommenderEngine {
  private worker: Worker | null = null;
  private readyPromise: Promise<TitleEntry[]> | null = null;
  private pendingRecommend: { resolve: (v: AnimeOut[]) => void; reject: (e: unknown) => void } | null = null;
  private pendingAnime: { resolve: (v: AnimeOut | null) => void; reject: (e: unknown) => void } | null = null;

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("../workers/recommender.worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => this.handleMessage(e.data);
      this.worker.onerror = (err) => {
        this.pendingRecommend?.reject(err);
        this.pendingAnime?.reject(err);
      };
    }
    return this.worker;
  }

  private handleMessage(msg: WorkerMessage) {
    if (msg.type === "RECOMMEND_RESULT") {
      this.pendingRecommend?.resolve(msg.payload);
      this.pendingRecommend = null;
    } else if (msg.type === "ANIME_RESULT") {
      this.pendingAnime?.resolve(msg.payload);
      this.pendingAnime = null;
    } else if (msg.type === "ERROR") {
      this.pendingRecommend?.reject(new Error(msg.payload));
      this.pendingAnime?.reject(new Error(msg.payload));
      this.pendingRecommend = null;
      this.pendingAnime = null;
    }
  }

  /** Initialize once — fetches CSV and parses it in the worker. */
  init(): Promise<TitleEntry[]> {
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = new Promise<TitleEntry[]>((resolve, reject) => {
      const worker = this.getWorker();

      const handler = (e: MessageEvent<WorkerMessage>) => {
        if (e.data.type === "READY") {
          worker.removeEventListener("message", handler);
          resolve(e.data.payload.titles);
        } else if (e.data.type === "ERROR") {
          worker.removeEventListener("message", handler);
          reject(new Error(e.data.payload));
        }
      };

      worker.addEventListener("message", handler);
      worker.postMessage({ type: "INIT" });
    });

    return this.readyPromise;
  }

  /** Fetch details for a single anime by title. */
  getAnime(title: string): Promise<AnimeOut | null> {
    return new Promise((resolve, reject) => {
      this.pendingAnime = { resolve, reject };
      this.getWorker().postMessage({ type: "GET_ANIME", payload: { title } });
    });
  }

  /** Get TF-IDF recommendations for a title. */
  recommend(params: RecommendParams): Promise<AnimeOut[]> {
    return new Promise((resolve, reject) => {
      this.pendingRecommend = { resolve, reject };
      this.getWorker().postMessage({ type: "RECOMMEND", payload: params });
    });
  }
}

// Singleton instance shared across the app
export const engine = new RecommenderEngine();
