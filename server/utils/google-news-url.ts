type Fetcher = typeof fetch

function articleId(value: string) {
  try {
    const url = new URL(value)
    const parts = url.pathname.split("/").filter(Boolean)
    if (url.hostname !== "news.google.com" || parts.at(-2) !== "articles") return ""
    return parts.at(-1) ?? ""
  } catch {
    return ""
  }
}

function cleanPublisherUrl(value: string) {
  try {
    const url = new URL(value)
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.hostname === "news.google.com") return ""
    url.hash = ""
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ["from", "source", "spm", "campaign", "oid", "vt"].includes(key.toLowerCase())) url.searchParams.delete(key)
    }
    return url.toString()
  } catch {
    return ""
  }
}

function attribute(html: string, name: string) {
  return html.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1] ?? ""
}

function decodedBatchUrl(text: string) {
  const marker = "[\\\"garturlres\\\",\\\""
  const start = text.indexOf(marker)
  if (start < 0) return ""
  const rest = text.slice(start + marker.length)
  const end = rest.indexOf("\\\",")
  if (end < 0) return ""
  try {
    return cleanPublisherUrl(JSON.parse(`"${rest.slice(0, end)}"`))
  } catch {
    return ""
  }
}

// Google News uses an undocumented redirect envelope. The request shape follows
// the public MIT-licensed reverse engineering at:
// https://gist.github.com/huksley/bc3cb046157a99cd9d1517b32f91a99e
export async function resolveGoogleNewsUrl(value: string, fetcher: Fetcher = fetch) {
  const id = articleId(value)
  if (!id) throw new Error("invalid Google News article URL")
  const page = await fetcher(value, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; KuaizhunyiEdgeResolver/1.0)", "Accept": "text/html" },
    redirect: "follow",
  })
  if (!page.ok) throw new Error(`Google News page HTTP ${page.status}`)
  const html = await page.text()
  const signature = attribute(html, "data-n-a-sg")
  const timestamp = attribute(html, "data-n-a-ts")
  if (!signature || !/^\d+$/.test(timestamp)) throw new Error("Google News decode parameters missing")
  const inner = JSON.stringify(["garturlreq", [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, Number(timestamp), signature])
  const request = JSON.stringify([[["Fbv4je", inner, null, "generic"]]])
  const response = await fetcher("https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "Referer": "https://news.google.com/" },
    body: new URLSearchParams({ "f.req": request }),
  })
  if (!response.ok) throw new Error(`Google News decode HTTP ${response.status}`)
  const resolved = decodedBatchUrl(await response.text())
  if (!resolved) throw new Error("Google News did not return a publisher URL")
  return resolved
}
