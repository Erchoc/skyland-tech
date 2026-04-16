export function getReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const cjkChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalWords = words + cjkChars;
  const minutes = Math.max(1, Math.ceil(totalWords / 300));
  return `${minutes} min`;
}
