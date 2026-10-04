import type { NewsItem } from "@shared/types"

interface RSSFeedOptions {
  title: string
  description: string
  siteUrl: string
  feedUrl: string
  items: NewsItem[]
}

export function escapeXml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function validDate(value: NewsItem["pubDate"]) {
  const date = new Date(value ?? 0)
  return Number.isNaN(date.valueOf()) ? undefined : date.toUTCString()
}

export function buildRSSFeed(options: RSSFeedOptions) {
  const items = options.items.map((item) => {
    const pubDate = validDate(item.pubDate)
    return [
      "    <item>",
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${escapeXml(item.url)}</link>`,
      `      <guid isPermaLink="false">${escapeXml(item.id)}</guid>`,
      pubDate ? `      <pubDate>${pubDate}</pubDate>` : "",
      `      <description>${escapeXml(item.title)}</description>`,
      "    </item>",
    ].filter(Boolean).join("\n")
  }).join("\n")

  const lastBuildDate = validDate(options.items[0]?.pubDate) ?? new Date().toUTCString()
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">",
    "  <channel>",
    `    <title>${escapeXml(options.title)}</title>`,
    `    <link>${escapeXml(options.siteUrl)}</link>`,
    `    <description>${escapeXml(options.description)}</description>`,
    "    <language>zh-CN</language>",
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(options.feedUrl)}" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n")
}
