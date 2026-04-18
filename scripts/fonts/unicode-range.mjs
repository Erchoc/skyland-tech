export function toUnicodeRange(charSet) {
  if (charSet.size === 0) return "";
  const codes = [...charSet].map((c) => c.codePointAt(0)).sort((a, b) => a - b);
  const groups = [];
  let start = codes[0];
  let prev = codes[0];
  for (let i = 1; i < codes.length; i++) {
    if (codes[i] === prev + 1) {
      prev = codes[i];
      continue;
    }
    groups.push([start, prev]);
    start = prev = codes[i];
  }
  groups.push([start, prev]);
  return groups
    .map(([a, b]) =>
      a === b
        ? `U+${a.toString(16).toUpperCase()}`
        : `U+${a.toString(16).toUpperCase()}-${b.toString(16).toUpperCase()}`,
    )
    .join(", ");
}
