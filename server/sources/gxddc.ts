import type { NewsItem } from "@shared/types"
import bundledSnapshot from "../../public/data/gxddc.json"

interface SnapshotItem {
  title?: string
  link?: string
  url?: string
  created?: string
  pubDate?: string
  publishedAt?: string
  discoveredAt?: string
  freshnessTier?: NewsItem["freshnessTier"]
}

interface Snapshot {
  generatedAt?: string
  lastCheckedAt?: string
  items?: SnapshotItem[]
}

export interface GxddcFeed {
  generatedAt?: string
  lastCheckedAt: string
  latestPublishedAt?: string
  isCheckDelayed: boolean
  items: NewsItem[]
}

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

const snapshotUrl = "https://raw.githubusercontent.com/suoyi2022/newsnow/main/public/data/gxddc.json"

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

function validTimestamp(value?: string) {
  return value && !Number.isNaN(Date.parse(value)) ? value : undefined
}

function tierFor(publishedAt?: string): NewsItem["freshnessTier"] {
  if (!publishedAt) return "reference"
  const ageHours = Math.max(0, Date.now() - Date.parse(publishedAt)) / 3_600_000
  if (ageHours <= 24) return "fresh"
  if (ageHours <= 72) return "recent"
  return "reference"
}

function validSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false
  const items = (value as Snapshot).items
  return Array.isArray(items) && items.some(item => (
    item
    && typeof item === "object"
    && typeof item.title === "string"
    && (typeof item.link === "string" || typeof item.url === "string")
  ))
}

function tierLabel(tier: NewsItem["freshnessTier"]) {
  if (tier === "fresh") return "24小时内"
  if (tier === "recent") return "72小时内"
  return "历史参考"
}

export async function getGxddcFeed(): Promise<GxddcFeed> {
  let snapshot = bundledSnapshot as Snapshot

  try {
    const remoteSnapshot = await myFetch<unknown>(snapshotUrl, {
      retry: 1,
      timeout: 5000,
    })
    if (validSnapshot(remoteSnapshot)) snapshot = remoteSnapshot
  } catch {}

  let items = snapshot.items ?? []
  let usedLiveSearch = false
  if (!items.length) {
    const feeds = await Promise.allSettled(urls.map(url => rss2json(url)))
    items = feeds.flatMap(result => result.status === "fulfilled" ? result.value?.items ?? [] : [])
    usedLiveSearch = true
  }

  if (!items.length) throw new Error("Cannot fetch shared mobility rss data")

  const seen = new Set<string>()
  const mappedItems = items
    .filter(item => item && typeof item === "object" && typeof item.title === "string" && (typeof item.link === "string" || typeof item.url === "string") && isRelevantMobilityTitle(item.title))
    .filter((item) => {
      const fingerprint = item.title!.replace(/\s+/g, "").toLocaleLowerCase()
      if (seen.has(fingerprint)) return false
      seen.add(fingerprint)
      return true
    })
    .map((item) => {
      const publishedAt = item.publishedAt ?? item.created ?? item.pubDate
      const freshnessTier = item.freshnessTier ?? tierFor(publishedAt)
      return {
        title: item.title!,
        url: item.link ?? item.url!,
        id: item.link ?? item.url!,
        pubDate: publishedAt,
        publishedAt,
        discoveredAt: item.discoveredAt,
        freshnessTier,
        extra: { info: tierLabel(freshnessTier) },
      }
    })
    .sort((a, b) => Date.parse(b.pubDate ?? "") - Date.parse(a.pubDate ?? ""))

  const checkedFallback = new Date().toISOString()
  const lastCheckedAt = usedLiveSearch
    ? checkedFallback
    : validTimestamp(snapshot.lastCheckedAt) ?? validTimestamp(snapshot.generatedAt) ?? checkedFallback
  const latestPublishedAt = mappedItems
    .map(item => validTimestamp(String(item.publishedAt ?? item.pubDate ?? "")))
    .find(Boolean)

  return {
    generatedAt: validTimestamp(snapshot.generatedAt),
    lastCheckedAt,
    latestPublishedAt,
    isCheckDelayed: Date.now() - Date.parse(lastCheckedAt) > 45 * 60 * 1000,
    items: mappedItems,
  }
}

export default defineSource(async () => (await getGxddcFeed()).items)
