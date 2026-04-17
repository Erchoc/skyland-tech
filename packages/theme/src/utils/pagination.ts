export type PaginationItem =
  | { type: "page"; value: number; active: boolean; href: string }
  | { type: "ellipsis" };

export function pageUrl(page: number): string {
  return page <= 1 ? "/" : `/page/${page}`;
}

export function buildPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 1) return [];

  const items: PaginationItem[] = [];
  const pushPage = (i: number) => {
    items.push({ type: "page", value: i, active: i === currentPage, href: pageUrl(i) });
  };

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pushPage(i);
    return items;
  }

  pushPage(1);
  if (currentPage > 3) items.push({ type: "ellipsis" });
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) pushPage(i);
  if (currentPage < totalPages - 2) items.push({ type: "ellipsis" });
  pushPage(totalPages);
  return items;
}
