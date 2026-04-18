// 构建期会对每篇文章反复调用（index.astro + page/[page].astro 两处），
// 对 N 篇 × M 页的静态站来说是 N*M 次重复计算。cacheKey 通常传 entry.id，
// 同一轮构建内命中即 O(1)。
const cache = new Map<string, string>();

export function getReadingTime(content: string, cacheKey?: string): string {
  if (cacheKey !== undefined) {
    const hit = cache.get(cacheKey);
    if (hit !== undefined) return hit;
  }
  const words = content.trim().split(/\s+/).length;
  const cjkChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalWords = words + cjkChars;
  const minutes = Math.max(1, Math.ceil(totalWords / 300));
  const result = `${minutes} min`;
  if (cacheKey !== undefined) cache.set(cacheKey, result);
  return result;
}
