import { resolveGoogleNewsUrl } from "#/utils/google-news-url"

export default defineEventHandler(async (event) => {
  const value = String(getQuery(event).url ?? "")
  try {
    const url = await resolveGoogleNewsUrl(value)
    setHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=604800")
    setHeader(event, "X-Content-Type-Options", "nosniff")
    return { url }
  } catch (error) {
    throw createError({ statusCode: 422, statusMessage: String(error instanceof Error ? error.message : error).slice(0, 120) })
  }
})
