import { describe, expect, it, vi } from "vitest"
import { resolveGoogleNewsUrl } from "#/utils/google-news-url"

describe("google News URL resolver", () => {
  it("resolves and strips tracking parameters", async () => {
    const responses = [
      new Response("<div data-n-a-sg=\"signature\" data-n-a-ts=\"123456\"></div>", { status: 200 }),
      new Response("[[[\\\"garturlres\\\",\\\"https://publisher.example/article?id=7\\u0026utm_source=google\\u0026oid=spam#fragment\\\",1]]]", { status: 200 }),
    ]
    const fetcher = vi.fn(async () => responses.shift()!) as unknown as typeof fetch
    await expect(resolveGoogleNewsUrl("https://news.google.com/rss/articles/envelope", fetcher)).resolves.toBe("https://publisher.example/article?id=7")
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it("rejects arbitrary URLs before fetching", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch
    await expect(resolveGoogleNewsUrl("https://example.com/article", fetcher)).rejects.toThrow("invalid Google News")
    expect(fetcher).not.toHaveBeenCalled()
  })
})
