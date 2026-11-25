/**
 * AI fill for the Image Cropper demo: the crop with its empty parts and a
 * mask go to OpenAI's image edit endpoint, and the filled picture comes back
 * as a PNG. The key stays here, on the server.
 *
 * Named `route.server.ts` so only the server build picks it up
 * (next.config.ts adds the "server.ts" page extension there). The static
 * preview export has no server and no route; the demo says so.
 */

/** Sizes the image models accept for edits. */
const SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"])
const MAX_UPLOAD = 8 * 1024 * 1024

const PROMPT = [
  "Outpaint this photograph.",
  "The sharp photo is the original; the blurred areas around it are placeholders.",
  "Replace only the blurred areas with sharp, realistic detail that continues the scene past the photo's edges:",
  "same perspective, horizon, lighting, colour grading, depth of field and grain.",
  "Keep the framing exactly as it is: do not zoom, crop, rotate, shift or re-compose the picture, and keep the original photo where it is.",
  "No borders, frames, vignettes, checkerboards, text, watermarks or new subjects.",
].join(" ")

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return Response.json({ error: "unconfigured" }, { status: 503 })

  // A demo endpoint spends real credits: only this site's own pages may call it.
  const origin = request.headers.get("origin")
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }

  const form = await request.formData().catch(() => null)
  const image = form?.get("image")
  const mask = form?.get("mask")
  const size = String(form?.get("size") ?? "")
  if (
    !(image instanceof Blob) ||
    !(mask instanceof Blob) ||
    !SIZES.has(size) ||
    image.size > MAX_UPLOAD ||
    mask.size > MAX_UPLOAD
  ) {
    return Response.json({ error: "bad_request" }, { status: 400 })
  }

  const body = new FormData()
  body.set("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-2")
  body.set("image", image, "image.png")
  body.set("mask", mask, "mask.png")
  body.set("prompt", PROMPT)
  body.set("size", size)
  body.set("n", "1")
  body.set("quality", process.env.OPENAI_IMAGE_QUALITY || "low")

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body,
    signal: request.signal,
  }).catch(() => null)

  if (!response?.ok) {
    // Log the status and OpenAI's message, never the key or the request.
    const detail = await response?.text().catch(() => "")
    console.error(
      "image-fill: OpenAI edit failed",
      response?.status,
      detail?.slice(0, 500)
    )
    return Response.json({ error: "failed" }, { status: 502 })
  }

  const json = (await response.json()) as { data?: { b64_json?: string }[] }
  const b64 = json.data?.[0]?.b64_json
  if (!b64) return Response.json({ error: "failed" }, { status: 502 })

  return new Response(Buffer.from(b64, "base64"), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  })
}
