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

const query = materialKeywords.map(keyword => `"${keyword}"`).join(" OR ")

const url = new URL("https://news.google.com/rss/search")
url.searchParams.set("q", query)
url.searchParams.set("hl", "zh-CN")
url.searchParams.set("gl", "CN")
url.searchParams.set("ceid", "CN:zh-Hans")

export default defineRSSSource(url.toString())
