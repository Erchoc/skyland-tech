// tag 原文可能含 `/`（例 "TCP/IP"、"CI/CD"），URL 里会被当路径分隔符，必须 slug 化
export function tagToSlug(tag: string): string {
  return tag.replace(/\//g, "-");
}
