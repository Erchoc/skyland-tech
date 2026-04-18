// tag 原文可能含 `/`（例 "TCP/IP"、"CI/CD"）、空格（例 "AI Agent"）、大小写差异
// （例 "Node.js" vs "node.js"），URL 需统一 slug 化防多路由。规则：
//   1. 转小写（合并 NodeJS/nodejs/NODEJS → nodejs）
//   2. 把 `/` 和连续空格都换成 `-`
//   3. 保留 CJK + ASCII 字母数字 + `.` + `-`
export function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[\s/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
