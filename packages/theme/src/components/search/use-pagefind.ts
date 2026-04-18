// packages/theme/src/components/search/use-pagefind.ts
import { useCallback, useEffect, useRef, useState } from "react";

export interface PagefindResult {
  id: string;
  url: string;
  meta: Record<string, string>;
  excerpt: string;
}

interface PagefindAPI {
  search(q: string): Promise<{ results: Array<{ id: string; data(): Promise<{ url: string; meta: Record<string, string>; excerpt: string }> }> }>;
}

let cached: PagefindAPI | null = null;
let loadPromise: Promise<PagefindAPI | null> | null = null;

async function loadPagefind(): Promise<PagefindAPI | null> {
  if (cached) return cached;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      // @ts-expect-error - runtime path, no types
      const mod = await import(/* @vite-ignore */ "/pagefind/pagefind.js");
      cached = mod as PagefindAPI;
      return cached;
    } catch {
      return null;
    }
  })();
  return loadPromise;
}

export interface UsePagefindState {
  ready: boolean;
  unavailable: boolean;
  loading: boolean;
  results: PagefindResult[];
  error: string | null;
}

export function usePagefind(query: string) {
  const [state, setState] = useState<UsePagefindState>({
    ready: false, unavailable: false, loading: false, results: [], error: null,
  });
  const reqId = useRef(0);

  useEffect(() => {
    loadPagefind().then(api => {
      if (api) setState(s => ({ ...s, ready: true }));
      else setState(s => ({ ...s, unavailable: true }));
    });
  }, []);

  useEffect(() => {
    if (!state.ready || query.length < 2) {
      setState(s => ({ ...s, results: [], loading: false }));
      return;
    }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const api = cached!;
        const { results: raw } = await api.search(query);
        const data = await Promise.all(raw.slice(0, 8).map(r => r.data()));
        if (id !== reqId.current) return;
        const results: PagefindResult[] = data.map((d, i) => ({
          id: raw[i].id, url: d.url, meta: d.meta, excerpt: d.excerpt,
        }));
        setState(s => ({ ...s, loading: false, results }));
      } catch (err) {
        if (id !== reqId.current) return;
        setState(s => ({ ...s, loading: false, error: String(err) }));
      }
    }, 120);
    return () => clearTimeout(t);
  }, [query, state.ready]);

  return state;
}
