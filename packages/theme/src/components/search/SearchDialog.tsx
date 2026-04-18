// packages/theme/src/components/search/SearchDialog.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { matchShortcut, parseShortcut } from "../../config/shortcut.ts";
import { SearchResult } from "./SearchResult.tsx";
import { usePagefind } from "./use-pagefind.ts";

interface Props {
  shortcut: string | string[];
  placeholder: string;
  trackSearch: boolean;
}

export function SearchDialog({ shortcut, placeholder, trackSearch }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const { results, loading, unavailable } = usePagefind(open ? query : "");

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    (triggerRef.current as HTMLElement | null)?.focus();
  }, []);

  useEffect(() => {
    const bindings = parseShortcut(shortcut);
    const onKey = (e: KeyboardEvent) => {
      if (!open && matchShortcut(e, bindings)) {
        e.preventDefault();
        triggerRef.current = document.activeElement;
        setOpen(true);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[active]) {
        e.preventDefault();
        window.location.href = results[active].url;
      }
    };
    document.addEventListener("keydown", onKey);
    const onOpenEvt = () => {
      triggerRef.current = document.activeElement;
      setOpen(true);
    };
    document.addEventListener("search-dialog:open", onOpenEvt);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("search-dialog:open", onOpenEvt);
    };
  }, [open, results, active, shortcut, close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!trackSearch || !open || query.length < 2 || loading) return;
    if (typeof window.umami?.track !== "function") return;
    window.umami.track("search", { query, results: results.length });
  }, [trackSearch, open, query, loading, results.length]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="搜索"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={close}
    >
      <div
        className="w-full max-w-[560px] sm:max-w-[680px] rounded-xl overflow-hidden"
        style={{
          background: "#161b22",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3.5 text-[15px] outline-none"
          style={{
            background: "transparent",
            color: "var(--color-dark-text)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
          disabled={unavailable}
        />
        <ul role="listbox" className="max-h-[50vh] overflow-y-auto">
          {unavailable && (
            <li className="px-4 py-6 text-[13px]" style={{ color: "#94a3b8" }}>
              开发模式下无索引。请运行 <code>pnpm build && pnpm start</code> 预览。
            </li>
          )}
          {!unavailable && query.length < 2 && (
            <li className="px-4 py-6 text-[13px]" style={{ color: "#94a3b8" }}>
              请输入 2 个或更多字符
            </li>
          )}
          {!unavailable && query.length >= 2 && loading && (
            <li className="px-4 py-6 text-[13px]" style={{ color: "#94a3b8" }}>
              搜索中...
            </li>
          )}
          {!unavailable && query.length >= 2 && !loading && results.length === 0 && (
            <li className="px-4 py-6 text-[13px]" style={{ color: "#94a3b8" }}>
              未找到「{query}」相关文章
            </li>
          )}
          {results.map((r, i) => (
            <SearchResult
              key={r.id}
              result={r}
              active={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                window.location.href = r.url;
              }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
