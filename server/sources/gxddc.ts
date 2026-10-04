const materialKeywords = [
  "共享单车",
  "共享电单车",
  "共享电动自行车",
  "共享电动车",
  "公共自行车",
  "公共电单车",
  "互联网租赁自行车",
  "两轮车换电",
  "电动自行车换电",
  "换电柜",
  "单车运维",
  "共享单车回收",
  "电动自行车合规",
  "城市准入",
  "电子围栏",
  "共享单车招标",
  "共享单车采购",
  "共享单车投诉",
]

const queryGroups = Array.from(
  { length: Math.ceil(materialKeywords.length / 6) },
  (_, index) => materialKeywords
    .slice(index * 6, index * 6 + 6)
    .map(keyword => `"${keyword}"`)
    .join(" OR "),
)

const mobilityPattern = /共享(?:单车|电单车|电动自行车|电动车|自行车|助力车|两轮车)|公共(?:自行车|电单车|助力车)|互联网租赁(?:自行车|电动自行车)|电动自行车|两轮车/
const industryPattern = /换电|运维|回收|合规|准入|电子围栏|招标|采购|投诉/

export function isRelevantMobilityTitle(title: string) {
  const normalizedTitle = title.replace(/\s+/g, "")
  return mobilityPattern.test(normalizedTitle)
    || normalizedTitle.includes("换电柜")
    || (normalizedTitle.includes("单车") && industryPattern.test(normalizedTitle))
}

const urls = queryGroups.map((query) => {
  const url = new URL("https://news.google.com/rss/search")
  url.searchParams.set("q", query)
  url.searchParams.set("hl", "zh-CN")
  url.searchParams.set("gl", "CN")
  url.searchParams.set("ceid", "CN:zh-Hans")
  return url.toString()
})

export default defineSource(async () => {
  const feeds = await Promise.allSettled(urls.map(url => rss2json(url)))
  const items = feeds.flatMap(result => result.status === "fulfilled" ? result.value?.items ?? [] : [])
  if (!items.length) throw new Error("Cannot fetch shared mobility rss data")

  const seen = new Set<string>()
  return items
    .filter(item => item.title && item.link && isRelevantMobilityTitle(item.title))
    .filter((item) => {
      const fingerprint = item.title.replace(/\s+/g, "").toLocaleLowerCase()
      if (seen.has(fingerprint)) return false
      seen.add(fingerprint)
      return true
    })
    .map(item => ({
      title: item.title,
      url: item.link,
      id: item.link,
      pubDate: item.created,
    }))
    .sort((a, b) => Date.parse(b.pubDate ?? "") - Date.parse(a.pubDate ?? ""))
})
