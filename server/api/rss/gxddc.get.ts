import { getGxddcFeed } from "#/sources/gxddc"
import { buildRSSFeed } from "#/utils/rss"

const siteUrl = "https://app1.kuaizhunyi.com.cn/newsnow/"
const feedUrl = `${siteUrl}api/rss/gxddc`

export default defineEventHandler(async (event) => {
  const feed = await getGxddcFeed()

  setHeader(event, "Content-Type", "application/rss+xml; charset=utf-8")
  setHeader(event, "Cache-Control", "public, max-age=900, s-maxage=1800")
  setHeader(event, "X-Content-Type-Options", "nosniff")

  return buildRSSFeed({
    title: "快准易 · 共享两轮车资讯",
    description: "共享单车、共享电单车、公共自行车、两轮车换电、运维、准入、招投标与合规资讯。",
    siteUrl,
    feedUrl,
    items: feed.items.slice(0, 30),
    lastBuildDate: feed.lastCheckedAt,
  })
})
