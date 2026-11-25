# Image Cropper: the AI fill route (Phase 3, step 3)

The component builds the request in the browser, for the part of the
photo's plane the crop reaches (its bounding box, plus a margin):

- **image:** the photo upright at a size image models accept (1024x1024,
  1536x1024 or 1024x1536), the room around it filled with the photo's edge
  pixels stretched outward and blurred. Upright and edge-extended on
  purpose: a tilted photo, or a blown-up copy behind it, makes the model
  re-frame the picture.
- **mask:** opaque where the photo is, transparent where to fill.

Your route forwards both to the model and returns the picture. The
component then finds the photo in the answer (models can nudge or zoom it)
and shifts the answer back so the seams meet. If the answer falls short of
the crop, it asks once more, starting from the first answer. So one fill
can be two requests. It lays the result under the photo and feathers the
photo's edges over it; the original pixels are never replaced.

## OpenAI route (Next.js App Router)

`app/api/image-fill/route.ts`:

```ts
const SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"])
const MAX_UPLOAD = 8 * 1024 * 1024

const PROMPT =
  "Outpaint this photograph. The sharp photo is the original; the blurred areas around it are placeholders. Replace only the blurred areas with sharp, realistic detail that continues the scene past the photo's edges: same perspective, horizon, lighting, colour grading, depth of field and grain. Keep the framing exactly as it is: do not zoom, crop, rotate, shift or re-compose the picture, and keep the original photo where it is. No borders, frames, vignettes, checkerboards, text, watermarks or new subjects."

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return Response.json({ error: "unconfigured" }, { status: 503 })
  // Add the app's auth and rate limiting here.

  const form = await request.formData().catch(() => null)
  const image = form?.get("image")
  const mask = form?.get("mask")
  const size = String(form?.get("size") ?? "")
  if (!(image instanceof Blob) || !(mask instanceof Blob) || !SIZES.has(size) ||
      image.size > MAX_UPLOAD || mask.size > MAX_UPLOAD) {
    return Response.json({ error: "bad_request" }, { status: 400 })
  }

  const body = new FormData()
  body.set("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-2")
  body.set("image", image, "image.png")
  body.set("mask", mask, "mask.png")
  body.set("prompt", PROMPT)
  body.set("size", size)
  body.set("quality", process.env.OPENAI_IMAGE_QUALITY || "low")

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body,
    signal: request.signal,
  }).catch(() => null)
  if (!res?.ok) return Response.json({ error: "failed" }, { status: 502 })

  const json = (await res.json()) as { data?: { b64_json?: string }[] }
  const b64 = json.data?.[0]?.b64_json
  if (!b64) return Response.json({ error: "failed" }, { status: 502 })
  return new Response(Buffer.from(b64, "base64"), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  })
}
```

If the app runs on an edge runtime without `Buffer`, decode with
`Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))`.

## The client side

```ts
import { ImageFillError, type ImageFillGenerate } from "@/components/ui/image-cropper"

const generateFill: ImageFillGenerate = async ({ image, mask, width, height, signal }) => {
  const form = new FormData()
  form.set("image", image, "image.png")
  form.set("mask", mask, "mask.png")
  form.set("size", `${width}x${height}`)
  const res = await fetch("/api/image-fill", { method: "POST", body: form, signal })
  if (res.status === 503) throw new ImageFillError("unconfigured")
  if (!res.ok) throw new ImageFillError("failed")
  return res.blob()
}
```

## Notes

- **Mask semantics:** in OpenAI image edits, transparent mask pixels mark
  what to change. The component already builds it that way. Other providers
  may want the inverse (white = fill); invert the mask in the route if so.
- **Other providers:** any inpainting or outpainting model works. Keep the
  route's contract: image + mask + size in, a picture of that size out.
- **Timeouts:** an edit takes 10 to 60 seconds. Raise the route's max
  duration on hosts that cut requests short.
- **Cost and abuse:** every fill is billed. Put the route behind the app's
  auth and rate limiter. The component asks only after a gesture settles,
  waits a moment, aborts stale requests and caches fills per crop.
- **Privacy:** the photo goes to the model provider. Say so in the plan if
  the app handles private images.
