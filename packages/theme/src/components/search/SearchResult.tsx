// packages/theme/src/components/search/SearchResult.tsx
import type { PagefindResult } from "./use-pagefind.ts";

interface Props {
  result: PagefindResult;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

export function SearchResult({ result, active, onMouseEnter, onClick }: Props) {
  const title = result.meta.title ?? result.url;
  return (
    <li
      role="option"
      aria-selected={active}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`px-4 py-2.5 cursor-pointer ${active ? "bg-[rgba(34,100,214,0.2)]" : ""}`}
      style={{ color: active ? "var(--color-dark-text)" : "#cbd5e1" }}
    >
      <div className="text-[14px] font-medium">{title}</div>
      <div
        className="text-[12px] mt-1 line-clamp-2 opacity-80"
        dangerouslySetInnerHTML={{ __html: result.excerpt }}
      />
    </li>
  );
}
