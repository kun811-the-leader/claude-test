/**
 * Web Search Tool Adapter (spec §46). Provider-agnostic interface so
 * market-researcher isn't welded to one search API. Without SEARCH_API_KEY,
 * falls back to a Mock provider whose results are clearly labeled as
 * placeholders — the agent must never present these as real findings.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export interface WebSearchAdapter {
  readonly mode: "live" | "mock";
  search(query: string): Promise<SearchResult[]>;
  fetch(url: string): Promise<string>;
}

class MockWebSearchAdapter implements WebSearchAdapter {
  readonly mode = "mock" as const;

  async search(query: string): Promise<SearchResult[]> {
    return [
      {
        title: `[MOCK 검색 결과 — SEARCH_API_KEY 미설정] "${query}"`,
        url: "https://example.com/mock-result",
        snippet:
          "실제 웹 검색 Provider가 연결되지 않아 예시 결과를 반환합니다. 이 결과를 사실로 인용하지 마세요.",
      },
    ];
  }

  async fetch(url: string): Promise<string> {
    return `[MOCK] ${url} 의 실제 내용을 가져올 수 없습니다 (SEARCH_API_KEY 미설정).`;
  }
}

// Real provider seam: implement against your chosen search API (Brave,
// Tavily, Bing, ...) and swap it in below once SEARCH_API_KEY is set. Left
// as a documented stub rather than guessing a specific vendor's request
// shape without credentials to verify it against.
class LiveWebSearchAdapter implements WebSearchAdapter {
  readonly mode = "live" as const;
  constructor(private apiKey: string) {}

  async search(query: string): Promise<SearchResult[]> {
    throw new Error(
      `LiveWebSearchAdapter.search() is not wired to a provider yet. Pick a search API, ` +
        `implement the request here using SEARCH_API_KEY, and this stops throwing. Query was: ${query}`
    );
  }

  async fetch(url: string): Promise<string> {
    const res = await fetch(url);
    return res.text();
  }
}

let cached: WebSearchAdapter | null = null;

export function getWebSearchAdapter(): WebSearchAdapter {
  if (cached) return cached;
  const key = process.env.SEARCH_API_KEY;
  cached = key ? new LiveWebSearchAdapter(key) : new MockWebSearchAdapter();
  return cached;
}
