import { describe, expect, it } from "vitest"
import { buildRSSFeed, escapeXml } from "../server/utils/rss"

describe("shared mobility RSS", () => {
  it("escapes XML special characters", () => {
    expect(escapeXml(`A&B <C> "D" 'E'`)).toBe("A&amp;B &lt;C&gt; &quot;D&quot; &apos;E&apos;")
  })

  it("builds a valid RSS 2.0 document", () => {
    const xml = buildRSSFeed({
      title: "快准易 & 资讯",
      description: "共享两轮车",
      siteUrl: "https://example.com/",
      feedUrl: "https://example.com/api/rss/gxddc",
      items: [{
        id: "news-1",
        title: "政策 <发布>",
        url: "https://example.com/news?a=1&b=2",
        pubDate: "Sun, 04 Oct 2026 09:00:59 GMT",
      }],
    })

    expect(xml).toContain("<rss version=\"2.0\"")
    expect(xml).toContain("<title>快准易 &amp; 资讯</title>")
    expect(xml).toContain("<title>政策 &lt;发布&gt;</title>")
    expect(xml).toContain("<link>https://example.com/news?a=1&amp;b=2</link>")
    expect(xml).toContain("<pubDate>Sun, 04 Oct 2026 09:00:59 GMT</pubDate>")
  })
})
