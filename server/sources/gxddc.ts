const query = [
  "\"共享电单车\"",
  "\"共享电动自行车\"",
  "\"共享电动车\"",
].join(" OR ")

const url = new URL("https://news.google.com/rss/search")
url.searchParams.set("q", query)
url.searchParams.set("hl", "zh-CN")
url.searchParams.set("gl", "CN")
url.searchParams.set("ceid", "CN:zh-Hans")

export default defineRSSSource(url.toString())
