"use client"

/**
 * Image Cropper — crop, straighten, turn and flip a photo, and never show an
 * empty corner.
 *
 * The crop frame sits still on the stage and the photo moves under it. Every
 * frame, the photo's scale and position are clamped so the frame stays
 * inside it: straighten by 12° and the photo grows just enough to cover the
 * frame's corners, straighten back and it shrinks to where you left it.
 *
 * With `generateFill`, an "AI fill" switch relaxes that clamp. You can turn
 * or zoom past the photo's edges, and when you let go the empty parts are
 * sent to your `generateFill` (an image model behind your server) and the
 * generated pixels resolve into place under the original.
 *
 * Coordinates, so the maths below reads:
 *   stage  CSS pixels of the stage box, origin top-left.
 *   box    the photo's own frame, in source pixels, origin at its centre,
 *          before any flip. A point b in box space sits on the stage at
 *          T + R(θ)·s·b, where T is the photo's centre on the stage.
 *   f      the box point under the centre of the crop frame. Storing f
 *          (not T) is what makes the photo turn around the crop's centre.
 */

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react"
import {
  ArrowCounterClockwiseIcon,
  ArrowUUpLeftIcon,
  FlipHorizontalIcon,
  SparkleIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* Public types                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A crop, independent of the screen it was made on. Everything is in the
 * source image's pixels, so the same value crops the full-size original.
 */
export type ImageCrop = {
  /** Centre of the crop, from the image's top-left, in source pixels. */
  x: number
  y: number
  /** Size of the crop in source pixels: the size of the exported image. */
  width: number
  height: number
  /** Degrees clockwise, quarter turns included (90 + 3.5 is 93.5). */
  rotation: number
  /** Mirrored left to right, as seen in the crop. */
  flipX: boolean
  /** Mirrored top to bottom, as seen in the crop. */
  flipY: boolean
}

/** Width over height, or "free" for a frame you size by hand. */
export type ImageCropAspect = "free" | number

/** A rectangle on the photo's plane, in source pixels from its top-left. */
export type ImageFillRegion = {
  x: number
  y: number
  width: number
  height: number
}

/** What `generateFill` receives: the photo with room around it, and a mask. */
export type ImageFillRequest = {
  /**
   * PNG at `width` × `height`: the photo upright, with room around it for
   * everything the crop reaches, the room covered by a blurred placeholder.
   */
  image: Blob
  /** PNG, same size: opaque where the photo is, transparent where to fill. */
  mask: Blob
  /** One of the sizes image models take: 1024×1024, 1536×1024 or 1024×1536. */
  width: number
  height: number
  /** The crop being filled. */
  crop: ImageCrop
  /** The part of the photo's plane the picture covers, in source pixels. */
  region: ImageFillRegion
  /**
   * Aborted when a newer crop replaces this one. A fill can take two
   * requests: when the model zooms its answer, a second pass starts from it.
   */
  signal: AbortSignal
}

/**
 * Turns a request into the filled picture, at the request's size: a Blob, or
 * a URL (data:, blob: or an https URL that allows CORS).
 */
export type ImageFillGenerate = (
  request: ImageFillRequest
) => Promise<Blob | string>

/** Throw it from `generateFill` to show the right message on the stage. */
export class ImageFillError extends Error {
  readonly code: "unconfigured" | "failed"
  constructor(code: "unconfigured" | "failed", message?: string) {
    super(message ?? code)
    this.name = "ImageFillError"
    this.code = code
  }
}

export type ImageCropperExportOptions = {
  /** The longest side of the output, in pixels. Defaults to the crop's own size. */
  maxSize?: number
  /** "image/png" (default), "image/jpeg" or "image/webp". */
  type?: string
  /** 0 to 1, for JPEG and WebP. */
  quality?: number
}

/** The imperative handle on `ref`: export what the frame shows. */
export type ImageCropperHandle = {
  toCanvas: (options?: ImageCropperExportOptions) => Promise<HTMLCanvasElement>
  toBlob: (options?: ImageCropperExportOptions) => Promise<Blob>
  /** The crop as it is right now. */
  getCrop: () => ImageCrop | null
}

export type ImageCropperOwnProps = {
  /** The photo. Cross-origin images need CORS headers to be exported. */
  src: string
  /** Controlled crop. Leave it out and the cropper keeps its own. */
  value?: ImageCrop
  /** A gesture settled: the new crop. Not called on every frame. */
  onValueChange?: (crop: ImageCrop) => void
  /** Controlled aspect. Starts on "free" when left out. */
  aspect?: ImageCropAspect
  /** The person picked an aspect, or a quarter turn flipped it. */
  onAspectChange?: (aspect: ImageCropAspect) => void
  /** Fills the parts of the frame past the photo's edges. Shows the "AI fill" switch. */
  generateFill?: ImageFillGenerate
  /** Controlled "AI fill" switch. Starts off when left out. */
  fill?: boolean
  /** The person flipped the "AI fill" switch. */
  onFillChange?: (fill: boolean) => void
  /** Export the crop: `toBlob()`, `toCanvas()`, `getCrop()`. */
  ref?: Ref<ImageCropperHandle>
}

export type ImageCropperProps = ImageCropperOwnProps &
  Omit<ComponentProps<"div">, keyof ImageCropperOwnProps>

/** The aspect presets in the toolbar. */
export const IMAGE_CROP_ASPECTS: readonly {
  label: string
  value: ImageCropAspect
}[] = [
  { label: "Free", value: "free" },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "16:9", value: 16 / 9 },
]

/* -------------------------------------------------------------------------- */
/* Tuning                                                                     */
/* -------------------------------------------------------------------------- */

/** Fine rotation reaches ±45°; quarter turns cover the rest. */
const MAX_FINE = 45
/** Dial pixels per degree. */
const DIAL_PX = 6
/** Within this many degrees of level, the dial holds at 0. */
const DIAL_SNAP = 0.8
/** The crop frame's clearance from the stage edge. */
const STAGE_PAD = 20
/** The smallest crop frame, on screen. */
const MIN_CROP = 48
/** How far past the cover scale you can zoom in. */
const MAX_ZOOM = 10
/**
 * With AI fill on, how far past the photo the crop can reach on each side, as
 * a share of the photo's short side. Zooming out and panning both stop there.
 */
const FILL_REACH = 0.25
/** Feathered edge of the photo over a fill, as a share of its short side. */
const FEATHER = 0.012
/** Wait after a crop settles before asking for a fill. */
const FILL_DEBOUNCE_MS = 350
/** Wait after resizing the frame before it grows back to fill the stage. */
const REFIT_DELAY_MS = 450

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"

/* -------------------------------------------------------------------------- */
/* Maths                                                                      */
/* -------------------------------------------------------------------------- */

type Vec = { x: number; y: number }
type Rect = { x0: number; y0: number; x1: number; y1: number }

const rad = (deg: number) => (deg * Math.PI) / 180
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

/** Rotates v by `deg` degrees clockwise (screen y points down). */
function rotate(v: Vec, deg: number): Vec {
  const t = rad(deg)
  const c = Math.cos(t)
  const s = Math.sin(t)
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }
}

/**
 * The size of a cw × ch frame turned by `deg`, measured along the photo's own
 * axes: the box the frame needs inside the photo.
 */
function rotatedExtent(cw: number, ch: number, deg: number) {
  const c = Math.abs(Math.cos(rad(deg)))
  const s = Math.abs(Math.sin(rad(deg)))
  return { w: cw * c + ch * s, h: cw * s + ch * c }
}

/**
 * The smallest scale at which a w × h photo, turned by `deg`, covers a
 * cw × ch frame centred on it. The frame turned into the photo's axes needs
 * a box of rotatedExtent(); the photo has to be at least that big on both
 * axes.
 */
function coverScale(cw: number, ch: number, deg: number, w: number, h: number) {
  const e = rotatedExtent(cw, ch, deg)
  return Math.max(e.w / w, e.h / h)
}

/**
 * How far the focal point may sit from the photo's centre, per axis, so a
 * cw × ch frame stays inside the photo at scale s: the photo's half size
 * minus the frame's half extent, both in box pixels.
 */
function focalLimit(
  cw: number,
  ch: number,
  deg: number,
  w: number,
  h: number,
  s: number
) {
  const e = rotatedExtent(cw / s, ch / s, deg)
  return { x: Math.max(0, (w - e.w) / 2), y: Math.max(0, (h - e.h) / 2) }
}

/** iOS-style rubber band: the further past, the less it gives. */
function rubber(v: number, min: number, max: number, dim: number) {
  const band = (d: number) => (1 - 1 / ((d * 0.55) / dim + 1)) * dim
  if (v < min) return min - band(min - v)
  if (v > max) return max + band(v - max)
  return v
}

function fitInto(w: number, h: number, boxW: number, boxH: number) {
  const k = Math.min(boxW / w, boxH / h)
  return { w: w * k, h: h * k, k }
}

/** The largest w/h = aspect rect inside a w × h rect. */
function inscribe(w: number, h: number, aspect: number) {
  return w / h > aspect ? { w: h * aspect, h } : { w, h: w / aspect }
}

function cropsEqual(
  a: ImageCrop | null | undefined,
  b: ImageCrop | null | undefined
) {
  if (!a || !b) return a === b
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5 &&
    Math.abs(a.rotation - b.rotation) < 0.01 &&
    a.flipX === b.flipX &&
    a.flipY === b.flipY
  )
}

/**
 * The upright part of the photo's plane a crop reaches into: the crop's
 * bounding box in source pixels, grown by `margin` so small moves after a
 * fill still land inside it.
 */
function fillRegion(c: ImageCrop, margin = 0): ImageFillRegion {
  const e = rotatedExtent(c.width, c.height, c.rotation)
  const width = e.w * (1 + margin)
  const height = e.h * (1 + margin)
  return { x: c.x - width / 2, y: c.y - height / 2, width, height }
}

function regionContains(outer: ImageFillRegion, inner: ImageFillRegion) {
  return (
    inner.x >= outer.x - 0.5 &&
    inner.y >= outer.y - 0.5 &&
    inner.x + inner.width <= outer.x + outer.width + 0.5 &&
    inner.y + inner.height <= outer.y + outer.height + 0.5
  )
}

/* -------------------------------------------------------------------------- */
/* Canvas                                                                     */
/* -------------------------------------------------------------------------- */

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    if (needsCors(src)) img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not load the image"))
    img.src = src
  })
}

function needsCors(src: string) {
  if (typeof window === "undefined" || /^(data|blob):/.test(src)) return false
  try {
    return new URL(src, window.location.href).origin !== window.location.origin
  } catch {
    return false
  }
}

function canvas(w: number, h: number) {
  const el = document.createElement("canvas")
  el.width = Math.max(1, Math.round(w))
  el.height = Math.max(1, Math.round(h))
  return el
}

function canvasToBlob(
  el: HTMLCanvasElement,
  type = "image/png",
  quality?: number
) {
  return new Promise<Blob>((resolve, reject) =>
    el.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Export failed"))),
      type,
      quality
    )
  )
}

/**
 * Sets the context up so drawing the source at (-w/2, -h/2) lands it where
 * the crop shows it, in a dw × dh destination at (dx, dy). The inverse of
 * the stage transform: centre, turn, scale, move the focal point to the
 * centre, flip.
 */
function applyCropTransform(
  ctx: CanvasRenderingContext2D,
  crop: ImageCrop,
  w: number,
  h: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const k = dw / crop.width
  const sx = crop.flipX ? -1 : 1
  const sy = crop.flipY ? -1 : 1
  ctx.translate(dx + dw / 2, dy + dh / 2)
  ctx.rotate(rad(crop.rotation))
  ctx.scale(k, (k * (dh / dw)) / (crop.height / crop.width))
  ctx.translate(-sx * (crop.x - w / 2), -sy * (crop.y - h / 2))
  ctx.scale(sx, sy)
}

/** The source with its edges faded, so it melts into a fill under it. */
function featherSource(img: CanvasImageSource, w: number, h: number) {
  const out = canvas(w, h)
  const ctx = out.getContext("2d")!
  ctx.drawImage(img, 0, 0, w, h)
  const f = Math.max(2, Math.min(w, h) * FEATHER)
  ctx.globalCompositeOperation = "destination-in"
  const gx = ctx.createLinearGradient(0, 0, w, 0)
  gx.addColorStop(0, "transparent")
  gx.addColorStop(f / w, "#000")
  gx.addColorStop(1 - f / w, "#000")
  gx.addColorStop(1, "transparent")
  ctx.fillStyle = gx
  ctx.fillRect(0, 0, w, h)
  const gy = ctx.createLinearGradient(0, 0, 0, h)
  gy.addColorStop(0, "transparent")
  gy.addColorStop(f / h, "#000")
  gy.addColorStop(1 - f / h, "#000")
  gy.addColorStop(1, "transparent")
  ctx.fillStyle = gy
  ctx.fillRect(0, 0, w, h)
  return out
}

/**
 * Renders a crop of an image to a canvas, at the crop's own size (or
 * `maxSize` on its long side). Works without the component: keep the
 * `ImageCrop` from `onValueChange` and crop the full-size original later.
 * Pass `fill` (a picture of `region`, in source pixels) to lay it under the
 * photo, which is then feathered into it.
 */
export async function cropImage(
  source: string | HTMLImageElement,
  crop: ImageCrop,
  options: {
    maxSize?: number
    fill?: { image: CanvasImageSource; region: ImageFillRegion }
  } = {}
) {
  const img = typeof source === "string" ? await loadImage(source) : source
  const w = img.naturalWidth
  const h = img.naturalHeight
  const scale = options.maxSize
    ? Math.min(1, options.maxSize / Math.max(crop.width, crop.height))
    : 1
  const out = canvas(crop.width * scale, crop.height * scale)
  const ctx = out.getContext("2d")!
  ctx.imageSmoothingQuality = "high"
  applyCropTransform(ctx, crop, w, h, 0, 0, out.width, out.height)
  // Drawing at (-w/2, -h/2) puts source pixel (0, 0) in place; a fill uses
  // the same frame, offset by its region.
  const fill = options.fill
  if (fill) {
    const r = fill.region
    ctx.drawImage(fill.image, r.x - w / 2, r.y - h / 2, r.width, r.height)
  }
  ctx.drawImage(fill ? featherSource(img, w, h) : img, -w / 2, -h / 2, w, h)
  return out
}

/** Sizes image models take, by aspect. */
const FILL_SIZES = [
  [1024, 1024],
  [1536, 1024],
  [1024, 1536],
] as const

type FillContent = { x: number; y: number; w: number; h: number }

/**
 * Builds what an image model needs, for a region of the photo's plane: the
 * photo drawn upright at a size the model accepts (letterboxed to keep the
 * region's shape), and a mask that keeps the photo and opens everything
 * else (transparent = fill, as OpenAI's edits read it).
 *
 * Upright on purpose: given a tilted photo, image models "fix" it and
 * re-frame the picture, and the fill no longer lines up. An upright photo
 * with room around it is plain outpainting, and it comes back in place.
 * The kept area is pulled in a few pixels so the model blends across the
 * seam instead of stopping at it.
 */
async function buildFillRequest(
  img: HTMLImageElement,
  region: ImageFillRegion,
  base?: { canvas: HTMLCanvasElement; known: FillContent }
) {
  const aspect = region.width / region.height
  const [W, H] = FILL_SIZES.reduce((best, size) =>
    Math.abs(Math.log(aspect / (size[0] / size[1]))) <
    Math.abs(Math.log(aspect / (best[0] / best[1])))
      ? size
      : best
  )
  const fit = fitInto(region.width, region.height, W, H)
  const content: FillContent = {
    x: (W - fit.w) / 2,
    y: (H - fit.h) / 2,
    w: fit.w,
    h: fit.h,
  }
  const w = img.naturalWidth
  const h = img.naturalHeight
  const place = (ctx: CanvasRenderingContext2D) => {
    ctx.translate(content.x, content.y)
    ctx.scale(fit.k, fit.k)
    ctx.translate(-region.x, -region.y)
  }

  // Opaque everywhere: transparent pixels tempt the model to paint a
  // checkerboard. The room around the photo gets its edge pixels stretched
  // outward and blurred: the right colours, and no structure at another
  // scale for the model to "restore" (a blown-up copy there makes it zoom).
  const image = canvas(W, H)
  const ictx = image.getContext("2d")!
  ictx.imageSmoothingQuality = "high"
  const extended = canvas(W, H)
  const ectx = extended.getContext("2d")!
  place(ectx)
  edgeExtend(ectx, img, region)
  ictx.filter = `blur(${Math.round(Math.max(W, H) / 48)}px)`
  ictx.drawImage(extended, 0, 0)
  ictx.filter = "none"
  // A second pass starts from the first answer: it fills more of the frame,
  // so the model has less to invent and keeps it in place.
  if (base) {
    ictx.drawImage(base.canvas, content.x, content.y, content.w, content.h)
  }
  ictx.save()
  place(ictx)
  ictx.drawImage(img, 0, 0, w, h)
  ictx.restore()

  const mask = canvas(W, H)
  const mctx = mask.getContext("2d")!
  mctx.fillStyle = "#000"
  if (base) {
    const k = base.known
    mctx.fillRect(content.x + k.x + 8, content.y + k.y + 8, k.w - 16, k.h - 16)
  }
  place(mctx)
  const m = 8 / fit.k
  mctx.fillRect(m, m, w - 2 * m, h - 2 * m)

  const [imageBlob, maskBlob] = await Promise.all([
    canvasToBlob(image),
    canvasToBlob(mask),
  ])
  // Where the photo sits in the request, for finding it in the answer.
  const photo: FillContent = {
    x: content.x - region.x * fit.k,
    y: content.y - region.y * fit.k,
    w: w * fit.k,
    h: h * fit.k,
  }
  return {
    image: imageBlob,
    mask: maskBlob,
    width: W,
    height: H,
    content,
    photo,
  }
}

/**
 * Stretches the photo's outermost pixels across the room around it, in
 * source coordinates: edges outward, corners into the corners.
 */
function edgeExtend(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  region: ImageFillRegion
) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const left = Math.min(region.x, 0)
  const top = Math.min(region.y, 0)
  const right = Math.max(region.x + region.width, w)
  const bottom = Math.max(region.y + region.height, h)
  const e = 2 // source pixels sampled at each edge
  ctx.drawImage(img, 0, 0, w, h)
  if (left < 0) ctx.drawImage(img, 0, 0, e, h, left, 0, -left, h)
  if (right > w) ctx.drawImage(img, w - e, 0, e, h, w, 0, right - w, h)
  if (top < 0) ctx.drawImage(img, 0, 0, w, e, 0, top, w, -top)
  if (bottom > h) ctx.drawImage(img, 0, h - e, w, e, 0, h, w, bottom - h)
  const corner = (
    sx: number,
    sy: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ) => {
    if (dw > 0 && dh > 0) ctx.drawImage(img, sx, sy, e, e, dx, dy, dw, dh)
  }
  corner(0, 0, left, top, -left, -top)
  corner(w - e, 0, w, top, right - w, -top)
  corner(0, h - e, left, h, -left, bottom - h)
  corner(w - e, h - e, w, h, right - w, bottom - h)
}

/** Luminance of an image drawn at w × h. */
function luminance(img: CanvasImageSource, w: number, h: number) {
  const c = canvas(w, h)
  const ctx = c.getContext("2d", { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  const d = ctx.getImageData(0, 0, c.width, c.height).data
  const out = new Float32Array(c.width * c.height)
  for (let i = 0; i < out.length; i++) {
    out[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114
  }
  return { data: out, w: c.width, h: c.height }
}

/**
 * Where the model actually put the photo. Image models keep the scene but
 * can nudge it by a few percent, which would leave the seams a step off.
 * Normalised cross-correlation of the photo against the answer, coarse to
 * fine (scale, then position), finds it; null when nothing matches well.
 */
function locatePhoto(
  answer: HTMLCanvasElement,
  photo: CanvasImageSource,
  expect: FillContent
) {
  const W = answer.width
  const H = answer.height
  const search = (
    width: number,
    scales: number[],
    cx: number,
    cy: number,
    radius: number
  ) => {
    const r = width / W
    const G = luminance(answer, width, Math.round(H * r))
    let best = { score: -2, scale: 1, cx, cy }
    for (const scale of scales) {
      const T = luminance(photo, expect.w * r * scale, expect.h * r * scale)
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ox = Math.round(cx * r + dx - T.w / 2)
          const oy = Math.round(cy * r + dy - T.h / 2)
          let n = 0
          let sa = 0
          let sb = 0
          let saa = 0
          let sbb = 0
          let sab = 0
          for (let y = Math.max(0, -oy); y < T.h && oy + y < G.h; y++) {
            for (let x = Math.max(0, -ox); x < T.w && ox + x < G.w; x++) {
              const a = T.data[y * T.w + x]
              const b = G.data[(oy + y) * G.w + ox + x]
              n++
              sa += a
              sb += b
              saa += a * a
              sbb += b * b
              sab += a * b
            }
          }
          if (n < T.w * T.h * 0.3 || n < 16) continue
          const score =
            (sab - (sa * sb) / n) /
            Math.sqrt((saa - (sa * sa) / n) * (sbb - (sb * sb) / n) + 1e-6)
          if (score > best.score) {
            best = {
              score,
              scale,
              cx: (ox + T.w / 2) / r,
              cy: (oy + T.h / 2) / r,
            }
          }
        }
      }
    }
    return best
  }
  const steps = (center: number, ratio: number, n: number) =>
    Array.from({ length: 2 * n + 1 }, (_, i) => center * ratio ** (i - n))
  const cx = expect.x + expect.w / 2
  const cy = expect.y + expect.h / 2
  let best = search(48, steps(1, 1.04, 18), cx, cy, 10)
  best = search(128, steps(best.scale, 1.012, 3), best.cx, best.cy, 4)
  best = search(256, steps(best.scale, 1.004, 2), best.cx, best.cy, 3)
  return best.score > 0.6 ? best : null
}

type FillEntry = {
  key: string
  url: string
  canvas: HTMLCanvasElement
  region: ImageFillRegion
}

/** The model's answer, drawn at the size it was asked for. */
async function loadAnswer(
  result: Blob | string,
  size: { width: number; height: number }
) {
  const url = typeof result === "string" ? result : URL.createObjectURL(result)
  try {
    const img = await loadImage(url)
    const answer = canvas(size.width, size.height)
    answer.getContext("2d")!.drawImage(img, 0, 0, size.width, size.height)
    return answer
  } finally {
    if (typeof result !== "string") URL.revokeObjectURL(url)
  }
}

/**
 * Cuts the region out of the answer, shifted and scaled so the photo in it
 * lands exactly on the original. Returns what it covers once corrected: a
 * model that zoomed in leaves the edges short.
 */
function correctAnswer(
  answer: HTMLCanvasElement,
  source: HTMLImageElement,
  req: { content: FillContent; photo: FillContent }
) {
  const { content, photo } = req
  const out = canvas(content.w, content.h)
  const ctx = out.getContext("2d")!
  ctx.imageSmoothingQuality = "high"
  const found = locatePhoto(answer, source, photo)
  if (!found) {
    ctx.drawImage(answer, -content.x, -content.y)
    return { out, covered: { x: 0, y: 0, w: content.w, h: content.h } }
  }
  // Answer point a lands at photo centre + (a − found centre) / scale.
  const ox = photo.x + photo.w / 2 - content.x - found.cx / found.scale
  const oy = photo.y + photo.h / 2 - content.y - found.cy / found.scale
  const aw = answer.width / found.scale
  const ah = answer.height / found.scale
  ctx.drawImage(answer, ox, oy, aw, ah)
  const x0 = Math.max(0, ox)
  const y0 = Math.max(0, oy)
  const x1 = Math.min(content.w, ox + aw)
  const y1 = Math.min(content.h, oy + ah)
  return { out, covered: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } }
}

/**
 * Fills a region of the photo's plane: one request, corrected into place.
 * If the corrected answer falls short of what the crop needs, a second
 * request starts from it, and that one comes back in place.
 */
async function generateRegionFill(
  img: HTMLImageElement,
  crop: ImageCrop,
  region: ImageFillRegion,
  generate: ImageFillGenerate,
  signal: AbortSignal
) {
  const ask = async (base?: {
    canvas: HTMLCanvasElement
    known: FillContent
  }) => {
    const req = await buildFillRequest(img, region, base)
    const result = await generate({
      image: req.image,
      mask: req.mask,
      width: req.width,
      height: req.height,
      crop,
      region,
      signal,
    })
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    const answer = await loadAnswer(result, {
      width: req.width,
      height: req.height,
    })
    return { req, answer, ...correctAnswer(answer, img, req) }
  }

  let pass = await ask()
  const k = pass.req.content.w / region.width
  const need = fillRegion(crop)
  const nx = (need.x - region.x) * k
  const ny = (need.y - region.y) * k
  const c = pass.covered
  const short =
    c.x > nx + 1 ||
    c.y > ny + 1 ||
    c.x + c.w < nx + need.width * k - 1 ||
    c.y + c.h < ny + need.height * k - 1
  if (short) pass = await ask({ canvas: pass.out, known: pass.covered })

  // The answer as it came first, under the corrected one, so any sliver the
  // correction uncovers still has something close in it.
  const { content } = pass.req
  const out = canvas(content.w, content.h)
  const ctx = out.getContext("2d")!
  ctx.drawImage(pass.answer, -content.x, -content.y)
  ctx.drawImage(pass.out, 0, 0)
  const blob = await canvasToBlob(out)
  return { canvas: out, url: URL.createObjectURL(blob) }
}

/* -------------------------------------------------------------------------- */
/* Engine: the gestures, the clamp and the springs, outside React             */
/* -------------------------------------------------------------------------- */

type Key = "cx" | "cy" | "cw" | "ch" | "fx" | "fy" | "rot" | "s" | "flip"
/**
 * Everything that moves. The crop frame (centre and size, stage px), the
 * focal point (box px), rotation (deg), the scale you chose, and the angle of
 * a running flip.
 */
type View = Record<Key, number>

/**
 * How the stored view becomes what's drawn:
 * hard  clamped (the default, and what a crop is read from)
 * soft  rubber-banded past the limits, while a finger is down
 * raw   as stored, while a spring carries it back inside
 */
type RenderMode = "hard" | "soft" | "raw"

type Resolved = { s: number; fx: number; fy: number }

type PointerGesture = {
  kind: "pointer"
  pointers: Map<number, Vec>
  mode: "pan" | "pinch"
  p0: Vec
  f0: Vec
  s0: number
  rot0: number
  d0: number
  a0: number
  local: Vec
  samples: { t: number; x: number; y: number }[]
}

type HandleGesture = {
  kind: "handle"
  id: number
  ex: -1 | 0 | 1
  ey: -1 | 0 | 1
  start: Rect
  p0: Vec
  T: Vec
  s: number
  moved: boolean
}

type DialGesture = {
  kind: "dial"
  id: number
  x0: number
  fine0: number
  lastSign: number
}

type Gesture =
  | PointerGesture
  | HandleGesture
  | DialGesture
  | { kind: "wheel"; local: Vec; p: Vec }

type Els = {
  root: HTMLElement | null
  stage: HTMLElement | null
  wrapper: HTMLElement | null
  image: HTMLElement | null
  frame: HTMLElement | null
  dialTrack: HTMLElement | null
  dialLabel: HTMLElement | null
  dial: HTMLElement | null
}

type Callbacks = {
  onCommit: (crop: ImageCrop) => void
  onFlip: (flipX: boolean, flipY: boolean) => void
  onAspect: (aspect: ImageCropAspect) => void
}

type Spring = {
  target: Partial<View>
  velocity: Partial<View>
  stiffness: number
  damping: number
  mode: RenderMode
  onDone?: () => void
}

class CropEngine {
  els: Els = {
    root: null,
    stage: null,
    wrapper: null,
    image: null,
    frame: null,
    dialTrack: null,
    dialLabel: null,
    dial: null,
  }
  callbacks: Callbacks = {
    onCommit: () => {},
    onFlip: () => {},
    onAspect: () => {},
  }

  /** Stable ref callbacks: the engine draws into these nodes directly. */
  nodes = {
    root: (node: HTMLElement | null) => {
      this.els.root = node
    },
    wrapper: (node: HTMLElement | null) => {
      this.els.wrapper = node
      this.render()
    },
    image: (node: HTMLElement | null) => {
      this.els.image = node
      this.render()
    },
    frame: (node: HTMLElement | null) => {
      this.els.frame = node
      this.render()
    },
    dial: (node: HTMLElement | null) => {
      this.els.dial = node
    },
    dialTrack: (node: HTMLElement | null) => {
      this.els.dialTrack = node
      this.renderDial()
    },
    dialLabel: (node: HTMLElement | null) => {
      this.els.dialLabel = node
      this.renderDial()
    },
  }

  /** Hands the engine a node it draws into directly. */
  attach(name: keyof Els, node: HTMLElement | null) {
    this.nodes[name as keyof typeof this.nodes]?.(node)
  }

  setCallbacks(callbacks: Callbacks) {
    this.callbacks = callbacks
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced
  }

  /** Watches the stage's size and takes the wheel and Safari's gesture events. */
  attachStage(node: HTMLElement | null) {
    this.els.stage = node
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      this.setStage(box.width, box.height)
    })
    observer.observe(node)
    const wheel = (e: WheelEvent) => this.wheel(e)
    const start = (e: Event) => this.gestureStart(e)
    const change = (e: Event) => this.gestureChange(e)
    const end = (e: Event) => this.gestureEnd(e)
    node.addEventListener("wheel", wheel, { passive: false })
    node.addEventListener("gesturestart", start)
    node.addEventListener("gesturechange", change)
    node.addEventListener("gestureend", end)
    return () => {
      observer.disconnect()
      node.removeEventListener("wheel", wheel)
      node.removeEventListener("gesturestart", start)
      node.removeEventListener("gesturechange", change)
      node.removeEventListener("gestureend", end)
      this.els.stage = null
    }
  }

  img: HTMLImageElement | null = null
  w = 0
  h = 0
  stageW = 0
  stageH = 0
  v: View = { cx: 0, cy: 0, cw: 0, ch: 0, fx: 0, fy: 0, rot: 0, s: 1, flip: 0 }
  turns = 0
  flipX = false
  flipY = false
  aspect: ImageCropAspect = "free"
  fill = false
  reduced = false
  ready = false
  mode: RenderMode = "hard"
  gesture: Gesture | null = null
  pending: ImageCrop | null = null

  private spring: Spring | null = null
  private raf = 0
  private last = 0
  private refitTimer = 0
  private settleTimer = 0
  private interacting = false

  /* ---- setup ---- */

  setImage(img: HTMLImageElement) {
    this.img = img
    this.w = img.naturalWidth
    this.h = img.naturalHeight
    this.ready = false
    this.maybeLayout()
  }

  setStage(w: number, h: number) {
    const had = this.stageW > 0 && this.ready
    this.stageW = w
    this.stageH = h
    if (had) {
      this.stop()
      const fit = this.fitCrop(this.v.cw, this.v.ch)
      this.v = {
        ...this.v,
        ...fit.view,
        s: this.resolve(this.v, "hard").s * fit.k,
      }
      this.render()
    } else this.maybeLayout()
  }

  private maybeLayout() {
    if (!this.img || !this.stageW) return
    this.ready = true
    if (this.pending) this.applyCrop(this.pending, false)
    else this.layoutDefault(false)
  }

  private inner() {
    const pad = Math.min(STAGE_PAD, this.stageW * 0.06)
    return { w: this.stageW - pad * 2, h: this.stageH - pad * 2 }
  }

  private fitCrop(cw: number, ch: number) {
    const box = this.inner()
    const fit = fitInto(cw, ch, box.w, box.h)
    return {
      k: fit.k,
      view: { cx: this.stageW / 2, cy: this.stageH / 2, cw: fit.w, ch: fit.h },
    }
  }

  /** The whole photo, upright, cut to the aspect if one is set. */
  private defaultView(): View {
    const size =
      this.aspect === "free"
        ? { w: this.w, h: this.h }
        : inscribe(this.w, this.h, this.aspect)
    const fit = this.fitCrop(size.w, size.h)
    return { ...fit.view, fx: 0, fy: 0, rot: 0, s: fit.k, flip: 0 }
  }

  layoutDefault(animate: boolean) {
    this.turns = 0
    const target = this.defaultView()
    if (this.flipX || this.flipY) {
      // Undo the mirror the way it was made: content flips, the angle eases.
      const fx = this.flipX
      this.flipX = false
      this.flipY = false
      this.v.fx = fx ? -this.v.fx : this.v.fx
      this.v.rot = -this.v.rot
      this.v.flip = 180
      this.callbacks.onFlip(false, false)
    }
    if (animate)
      this.animate(target, {
        duration: 0.5,
        mode: "raw",
        onDone: () => this.commit(),
      })
    else {
      this.v = target
      this.render()
      this.commit()
    }
  }

  /** Shows a crop value (controlled `value`, or the first one). */
  applyCrop(crop: ImageCrop, animate: boolean) {
    if (!this.ready) {
      this.pending = crop
      return
    }
    this.pending = null
    this.flipX = crop.flipX
    this.flipY = crop.flipY
    this.turns = Math.round(crop.rotation / 90)
    this.callbacks.onFlip(crop.flipX, crop.flipY)
    const fit = this.fitCrop(crop.width, crop.height)
    const target: View = {
      ...fit.view,
      s: fit.k,
      rot: crop.rotation,
      fx: (crop.flipX ? -1 : 1) * (crop.x - this.w / 2),
      fy: (crop.flipY ? -1 : 1) * (crop.y - this.h / 2),
      flip: 0,
    }
    if (animate) this.animate(target, { duration: 0.45, mode: "raw" })
    else {
      this.stop()
      this.v = target
      this.render()
    }
  }

  /* ---- the clamp ---- */

  resolve(v: View, mode: RenderMode): Resolved {
    if (mode === "raw") return { s: v.s, fx: v.fx, fy: v.fy }
    // The same cover math, against the photo or, with AI fill on, the photo
    // grown by its reach: the frame never shows more than that much fill.
    const b = this.bounds()
    const min = coverScale(v.cw, v.ch, v.rot, b.w, b.h)
    const max = coverScale(v.cw, v.ch, v.rot, this.w, this.h) * MAX_ZOOM
    const s =
      mode === "soft" ? rubber(v.s, min, max, min * 0.5) : clamp(v.s, min, max)
    const lim = focalLimit(v.cw, v.ch, v.rot, b.w, b.h, s)
    if (mode === "soft") {
      const dim = 90 / s
      return {
        s,
        fx: rubber(v.fx, -lim.x, lim.x, dim),
        fy: rubber(v.fy, -lim.y, lim.y, dim),
      }
    }
    return { s, fx: clamp(v.fx, -lim.x, lim.x), fy: clamp(v.fy, -lim.y, lim.y) }
  }

  /** What the crop must stay inside, in box px: the photo, plus the fill's reach. */
  private bounds() {
    const m = this.fill ? 2 * FILL_REACH * Math.min(this.w, this.h) : 0
    return { w: this.w + m, h: this.h + m }
  }

  /** The photo's centre on the stage. */
  private origin(v: View, r: Resolved): Vec {
    const o = rotate({ x: r.fx * r.s, y: r.fy * r.s }, v.rot)
    return { x: v.cx - o.x, y: v.cy - o.y }
  }

  private displayed() {
    return this.resolve(this.v, this.mode)
  }

  /** Bakes what's on screen into the stored view, so the next motion starts there. */
  private bake() {
    const r = this.displayed()
    this.v.s = r.s
    this.v.fx = r.fx
    this.v.fy = r.fy
  }

  /** A stage point in box space. */
  private toBox(p: Vec, T: Vec, s: number, rot: number): Vec {
    const b = rotate({ x: p.x - T.x, y: p.y - T.y }, -rot)
    return { x: b.x / s, y: b.y / s }
  }

  /** Whether any part of the crop frame is off the photo. */
  isUncovered() {
    if (!this.ready) return false
    const r = this.resolve(this.v, "hard")
    const T = this.origin(this.v, r)
    const { cx, cy, cw, ch, rot } = this.v
    return [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].some(([dx, dy]) => {
      const b = this.toBox(
        { x: cx + (dx * cw) / 2, y: cy + (dy * ch) / 2 },
        T,
        r.s,
        rot
      )
      return (
        Math.abs(b.x) > this.w / 2 + 0.5 || Math.abs(b.y) > this.h / 2 + 0.5
      )
    })
  }

  getCrop(): ImageCrop | null {
    if (!this.ready) return null
    const r = this.resolve(this.v, "hard")
    return {
      x: (this.flipX ? -1 : 1) * r.fx + this.w / 2,
      y: (this.flipY ? -1 : 1) * r.fy + this.h / 2,
      width: this.v.cw / r.s,
      height: this.v.ch / r.s,
      rotation: Math.round(this.v.rot * 100) / 100,
      flipX: this.flipX,
      flipY: this.flipY,
    }
  }

  private commit() {
    const crop = this.getCrop()
    if (crop) this.callbacks.onCommit(crop)
  }

  /* ---- drawing: straight to the DOM, never through React ---- */

  render() {
    const { wrapper, image, frame } = this.els
    if (!wrapper || !image || !frame || !this.ready) return
    const v = this.v
    const r = this.displayed()
    const T = this.origin(v, r)
    const flip =
      Math.abs(v.flip) > 0.01
        ? `translate3d(${v.cx}px,${v.cy}px,0) perspective(1200px) rotateY(${v.flip}deg) translate3d(${-v.cx}px,${-v.cy}px,0) `
        : ""
    wrapper.style.transform = `${flip}translate3d(${T.x}px,${T.y}px,0) rotate(${v.rot}deg) scale(${r.s})`
    image.style.transform = `scale(${this.flipX ? -1 : 1},${this.flipY ? -1 : 1}) translate(-50%,-50%)`
    frame.style.transform = `translate3d(${v.cx - v.cw / 2}px,${v.cy - v.ch / 2}px,0)`
    frame.style.width = `${v.cw}px`
    frame.style.height = `${v.ch}px`
    this.renderDial()
  }

  private fine() {
    return this.v.rot - this.turns * 90
  }

  private renderDial() {
    const fine = this.fine()
    const { dialTrack, dialLabel, dial } = this.els
    if (dialTrack)
      dialTrack.style.transform = `translate3d(${-(MAX_FINE + fine) * DIAL_PX}px,0,0)`
    const shown = Math.round(fine)
    const text = `${shown === 0 ? 0 : shown}°`
    if (dialLabel && dialLabel.textContent !== text)
      dialLabel.textContent = text
    if (dial) {
      dial.setAttribute("aria-valuenow", String(shown))
      dial.setAttribute("aria-valuetext", `${shown} degrees`)
    }
  }

  private setInteracting(on: boolean) {
    if (this.interacting === on) return
    this.interacting = on
    if (this.els.root) this.els.root.dataset.interacting = String(on)
  }

  /* ---- springs ---- */

  /**
   * Springs the given keys to their targets (Apple's duration/bounce form:
   * stiffness (2π/d)², damping 4π(1 − bounce)/d). Interruptible: a new
   * gesture stops it where it is. Reduced motion lands at once.
   */
  animate(
    target: Partial<View>,
    opts: {
      duration?: number
      bounce?: number
      velocity?: Partial<View>
      mode?: RenderMode
      onDone?: () => void
    } = {}
  ) {
    this.stop()
    const mode = opts.mode ?? "hard"
    if (this.reduced) {
      Object.assign(this.v, target)
      this.v.flip = 0
      this.mode = "hard"
      this.render()
      opts.onDone?.()
      return
    }
    const d = opts.duration ?? 0.45
    const bounce = opts.bounce ?? 0
    this.mode = mode
    this.spring = {
      target,
      velocity: { ...opts.velocity },
      stiffness: ((2 * Math.PI) / d) ** 2,
      damping: (4 * Math.PI * (1 - bounce)) / d,
      mode,
      onDone: opts.onDone,
    }
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    const sp = this.spring
    if (!sp) return
    const dt = Math.min(0.064, (now - this.last) / 1000)
    this.last = now
    let done = true
    const steps = 4
    for (const key of Object.keys(sp.target) as Key[]) {
      const to = sp.target[key]!
      let x = this.v[key]
      let vel = sp.velocity[key] ?? 0
      for (let i = 0; i < steps; i++) {
        const a = -sp.stiffness * (x - to) - sp.damping * vel
        vel += a * (dt / steps)
        x += vel * (dt / steps)
      }
      const eps =
        key === "s"
          ? 1e-4 * Math.max(1e-3, Math.abs(to))
          : key === "rot" || key === "flip"
            ? 0.01
            : 0.05
      if (Math.abs(x - to) > eps || Math.abs(vel) > eps * 10) done = false
      this.v[key] = x
      sp.velocity[key] = vel
    }
    if (done) {
      Object.assign(this.v, sp.target)
      this.spring = null
      this.mode = "hard"
      this.render()
      sp.onDone?.()
      return
    }
    this.render()
    this.raf = requestAnimationFrame(this.tick)
  }

  stop() {
    if (!this.spring) return
    cancelAnimationFrame(this.raf)
    const sp = this.spring
    this.spring = null
    // Keep exactly what's on screen.
    if (sp.mode !== "hard" || this.mode !== "hard") {
      this.bake()
      this.mode = "hard"
    }
  }

  /** Springs whatever is past the limits back inside, then commits. */
  settle(velocity?: Vec) {
    this.setInteracting(false)
    this.bake()
    this.mode = "raw"
    let fx = this.v.fx
    let fy = this.v.fy
    let vel: Partial<View> | undefined
    if (velocity && !this.reduced) {
      // Throw: carry on along the release velocity, then spring to rest.
      const local = rotate(velocity, -this.v.rot)
      const vfx = -local.x / this.v.s
      const vfy = -local.y / this.v.s
      fx += vfx * 0.18
      fy += vfy * 0.18
      vel = { fx: vfx, fy: vfy }
    }
    const target = this.resolve({ ...this.v, fx, fy }, "hard")
    this.animate(
      { s: target.s, fx: target.fx, fy: target.fy },
      {
        duration: this.reduced ? 0.2 : 0.5,
        velocity: vel,
        mode: "raw",
        onDone: () => this.commit(),
      }
    )
  }

  /* ---- stage gestures: pan, pinch, two-finger rotate ---- */

  private stagePoint(e: { clientX: number; clientY: number }): Vec {
    const rect = this.els.stage!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  /** Re-reads the pointers into a fresh baseline: on down, on up, on a finger change. */
  private baseline(g: PointerGesture) {
    this.bake()
    this.mode = "soft"
    const pts = [...g.pointers.values()]
    const c = centroid(pts)
    g.mode = pts.length >= 2 ? "pinch" : "pan"
    g.p0 = c
    g.f0 = { x: this.v.fx, y: this.v.fy }
    g.s0 = this.v.s
    g.rot0 = this.v.rot
    if (pts.length >= 2) {
      g.d0 = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1
      g.a0 =
        (Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 180) / Math.PI
    }
    const r = this.displayed()
    g.local = this.toBox(c, this.origin(this.v, r), r.s, this.v.rot)
    g.samples = [{ t: performance.now(), x: c.x, y: c.y }]
  }

  stageDown(e: PointerEvent) {
    if (!this.ready || (e.pointerType === "mouse" && e.button !== 0)) return
    if (this.gesture && this.gesture.kind !== "pointer") return
    window.clearTimeout(this.refitTimer)
    this.stop()
    this.els.stage?.setPointerCapture(e.pointerId)
    let g = this.gesture as PointerGesture | null
    if (!g) {
      g = {
        kind: "pointer",
        pointers: new Map(),
        mode: "pan",
        p0: { x: 0, y: 0 },
        f0: { x: 0, y: 0 },
        s0: 1,
        rot0: 0,
        d0: 1,
        a0: 0,
        local: { x: 0, y: 0 },
        samples: [],
      }
      this.gesture = g
    }
    if (g.pointers.size >= 2) return // a third finger changes nothing
    g.pointers.set(e.pointerId, this.stagePoint(e))
    this.baseline(g)
    this.setInteracting(true)
  }

  stageMove(e: PointerEvent) {
    const g = this.gesture
    if (!g || g.kind !== "pointer" || !g.pointers.has(e.pointerId)) return
    g.pointers.set(e.pointerId, this.stagePoint(e))
    const pts = [...g.pointers.values()]
    const c = centroid(pts)
    const now = performance.now()
    g.samples.push({ t: now, x: c.x, y: c.y })
    while (g.samples.length > 2 && now - g.samples[0].t > 100) g.samples.shift()

    if (g.mode === "pan") {
      // Track 1:1: the box point under the finger stays under it.
      const d = rotate({ x: c.x - g.p0.x, y: c.y - g.p0.y }, -this.v.rot)
      this.v.fx = g.f0.x - d.x / g.s0
      this.v.fy = g.f0.y - d.y / g.s0
    } else {
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const angle =
        (Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 180) / Math.PI
      let delta = angle - g.a0
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      this.v.s = (g.s0 * dist) / g.d0
      this.v.rot = clamp(
        g.rot0 + delta,
        this.turns * 90 - MAX_FINE,
        this.turns * 90 + MAX_FINE
      )
      this.pinToPoint(g.local, c)
    }
    this.render()
  }

  /** Moves the focal point so box point `local` sits under stage point `p`. */
  private pinToPoint(local: Vec, p: Vec) {
    const s = this.resolve(this.v, "soft").s
    const o = rotate({ x: local.x * s, y: local.y * s }, this.v.rot)
    const T = { x: p.x - o.x, y: p.y - o.y }
    const f = rotate({ x: this.v.cx - T.x, y: this.v.cy - T.y }, -this.v.rot)
    this.v.fx = f.x / s
    this.v.fy = f.y / s
  }

  stageUp(e: PointerEvent) {
    const g = this.gesture
    if (!g || g.kind !== "pointer" || !g.pointers.has(e.pointerId)) return
    const wasPan = g.mode === "pan"
    g.pointers.delete(e.pointerId)
    if (g.pointers.size > 0) {
      this.baseline(g)
      return
    }
    this.gesture = null
    let velocity: Vec | undefined
    if (wasPan && e.type === "pointerup" && g.samples.length > 1) {
      const a = g.samples[0]
      const b = g.samples[g.samples.length - 1]
      const dt = (b.t - a.t) / 1000
      if (dt > 0.008 && performance.now() - b.t < 60)
        velocity = { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt }
    }
    this.settle(velocity)
  }

  /* ---- trackpad pinch (ctrl + wheel) and Safari's gesture events ---- */

  wheel(e: WheelEvent) {
    if (!this.ready || !(e.ctrlKey || e.metaKey)) return
    if (this.gesture && this.gesture.kind !== "wheel") return
    e.preventDefault()
    const p = this.stagePoint(e)
    if (!this.gesture) {
      this.stop()
      this.bake()
      this.mode = "soft"
      this.gesture = { kind: "wheel", local: { x: 0, y: 0 }, p }
      this.setInteracting(true)
    }
    const r = this.displayed()
    const local = this.toBox(p, this.origin(this.v, r), r.s, this.v.rot)
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
    this.v.s *= Math.exp(-delta * 0.01)
    this.pinToPoint(local, p)
    this.render()
    window.clearTimeout(this.settleTimer)
    this.settleTimer = window.setTimeout(() => {
      this.gesture = null
      this.settle()
    }, 160)
  }

  private safari: { s0: number; rot0: number; local: Vec; p: Vec } | null = null

  gestureStart(
    e: Event & {
      scale?: number
      rotation?: number
      clientX?: number
      clientY?: number
    }
  ) {
    if (!this.ready || (this.gesture && this.gesture.kind !== "wheel")) return
    e.preventDefault()
    this.stop()
    this.bake()
    this.mode = "soft"
    const p = this.stagePoint({
      clientX: e.clientX ?? 0,
      clientY: e.clientY ?? 0,
    })
    const r = this.displayed()
    this.safari = {
      s0: this.v.s,
      rot0: this.v.rot,
      p,
      local: this.toBox(p, this.origin(this.v, r), r.s, this.v.rot),
    }
    this.gesture = { kind: "wheel", local: this.safari.local, p }
    this.setInteracting(true)
  }

  gestureChange(e: Event & { scale?: number; rotation?: number }) {
    if (!this.safari) return
    e.preventDefault()
    window.clearTimeout(this.settleTimer)
    this.v.s = this.safari.s0 * (e.scale ?? 1)
    this.v.rot = clamp(
      this.safari.rot0 + (e.rotation ?? 0),
      this.turns * 90 - MAX_FINE,
      this.turns * 90 + MAX_FINE
    )
    this.pinToPoint(this.safari.local, this.safari.p)
    this.render()
  }

  gestureEnd(e: Event) {
    if (!this.safari) return
    e.preventDefault()
    this.safari = null
    this.gesture = null
    this.settle()
  }

  /* ---- crop handles ---- */

  handleDown(e: PointerEvent, el: HTMLElement, ex: -1 | 0 | 1, ey: -1 | 0 | 1) {
    if (!this.ready || this.gesture) return
    e.stopPropagation()
    window.clearTimeout(this.refitTimer)
    this.stop()
    this.bake()
    this.mode = "hard"
    el.setPointerCapture(e.pointerId)
    const r = this.displayed()
    const { cx, cy, cw, ch } = this.v
    this.gesture = {
      kind: "handle",
      id: e.pointerId,
      ex,
      ey,
      start: {
        x0: cx - cw / 2,
        y0: cy - ch / 2,
        x1: cx + cw / 2,
        y1: cy + ch / 2,
      },
      p0: this.stagePoint(e),
      T: this.origin(this.v, r),
      s: r.s,
      moved: false,
    }
    this.setInteracting(true)
  }

  handleMove(e: PointerEvent) {
    const g = this.gesture
    if (!g || g.kind !== "handle" || g.id !== e.pointerId) return
    const p = this.stagePoint(e)
    const dx = p.x - g.p0.x
    const dy = p.y - g.p0.y
    if (!g.moved && Math.hypot(dx, dy) < 2) return
    g.moved = true
    const want = this.handleRect(g, dx, dy)
    const rect =
      this.aspect === "free" && g.ex !== 0 && g.ey !== 0
        ? // A free corner slides along an edge it can't pass.
          this.reach(
            this.reach(g.start, { ...g.start, x0: want.x0, x1: want.x1 }, g),
            want,
            g
          )
        : this.reach(g.start, want, g)
    this.v.cx = (rect.x0 + rect.x1) / 2
    this.v.cy = (rect.y0 + rect.y1) / 2
    this.v.cw = rect.x1 - rect.x0
    this.v.ch = rect.y1 - rect.y0
    // The photo holds still while the frame changes: re-derive the focal point.
    const f = this.toBox({ x: this.v.cx, y: this.v.cy }, g.T, g.s, this.v.rot)
    this.v.fx = f.x
    this.v.fy = f.y
    this.v.s = g.s
    this.render()
  }

  /** The rect the pointer asks for, before any limit. */
  private handleRect(g: HandleGesture, dx: number, dy: number): Rect {
    const r = { ...g.start }
    if (g.ex < 0) r.x0 += dx
    if (g.ex > 0) r.x1 += dx
    if (g.ey < 0) r.y0 += dy
    if (g.ey > 0) r.y1 += dy
    if (this.aspect === "free") return r
    const a = this.aspect
    const sw = g.start.x1 - g.start.x0
    const sh = g.start.y1 - g.start.y0
    let w = Math.max(MIN_CROP, r.x1 - r.x0)
    let h = Math.max(MIN_CROP, r.y1 - r.y0)
    if (g.ex !== 0 && g.ey !== 0) {
      if (w / sw > h / sh) h = w / a
      else w = h * a
    } else if (g.ex !== 0) h = w / a
    else w = h * a
    // Grow from the side opposite the handle; centre on the other axis.
    const cx = (g.start.x0 + g.start.x1) / 2
    const cy = (g.start.y0 + g.start.y1) / 2
    const x0 = g.ex > 0 ? g.start.x0 : g.ex < 0 ? g.start.x1 - w : cx - w / 2
    const y0 = g.ey > 0 ? g.start.y0 : g.ey < 0 ? g.start.y1 - h : cy - h / 2
    return { x0, y0, x1: x0 + w, y1: y0 + h }
  }

  /** How far from `from` toward `to` the frame can go and stay valid (bisection). */
  private reach(from: Rect, to: Rect, g: HandleGesture): Rect {
    const lerp = (t: number): Rect => ({
      x0: from.x0 + (to.x0 - from.x0) * t,
      y0: from.y0 + (to.y0 - from.y0) * t,
      x1: from.x1 + (to.x1 - from.x1) * t,
      y1: from.y1 + (to.y1 - from.y1) * t,
    })
    if (this.validRect(to, g)) return to
    let lo = 0
    let hi = 1
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2
      if (this.validRect(lerp(mid), g)) lo = mid
      else hi = mid
    }
    return lerp(lo)
  }

  private validRect(r: Rect, g: HandleGesture) {
    if (r.x1 - r.x0 < MIN_CROP - 0.01 || r.y1 - r.y0 < MIN_CROP - 0.01)
      return false
    if (
      r.x0 < -0.01 ||
      r.y0 < -0.01 ||
      r.x1 > this.stageW + 0.01 ||
      r.y1 > this.stageH + 0.01
    )
      return false
    const bounds = this.bounds()
    const pts = [
      { x: r.x0, y: r.y0 },
      { x: r.x1, y: r.y0 },
      { x: r.x1, y: r.y1 },
      { x: r.x0, y: r.y1 },
    ]
    return pts.every((p) => {
      const b = this.toBox(p, g.T, g.s, this.v.rot)
      return (
        Math.abs(b.x) <= bounds.w / 2 + 0.01 &&
        Math.abs(b.y) <= bounds.h / 2 + 0.01
      )
    })
  }

  handleUp(e: PointerEvent) {
    const g = this.gesture
    if (!g || g.kind !== "handle" || g.id !== e.pointerId) return
    this.gesture = null
    this.setInteracting(false)
    if (!g.moved) return
    this.commit()
    // After a beat, the frame grows back to fill the stage, the photo with it.
    this.refitTimer = window.setTimeout(() => this.refit(), REFIT_DELAY_MS)
  }

  private refit() {
    if (this.gesture) return
    this.bake()
    const fit = this.fitCrop(this.v.cw, this.v.ch)
    if (
      Math.abs(fit.k - 1) < 0.002 &&
      Math.abs(fit.view.cx - this.v.cx) < 0.5 &&
      Math.abs(fit.view.cy - this.v.cy) < 0.5
    )
      return
    this.animate(
      { ...fit.view, s: this.v.s * fit.k },
      { duration: 0.5, mode: "raw" }
    )
  }

  /* ---- the dial ---- */

  dialDown(e: PointerEvent, el: HTMLElement) {
    if (!this.ready || this.gesture) return
    this.stop()
    el.setPointerCapture(e.pointerId)
    this.gesture = {
      kind: "dial",
      id: e.pointerId,
      x0: e.clientX,
      fine0: this.fine(),
      lastSign: Math.sign(this.fine()),
    }
    this.setInteracting(true)
  }

  dialMove(e: PointerEvent) {
    const g = this.gesture
    if (!g || g.kind !== "dial" || g.id !== e.pointerId) return
    let fine = clamp(
      g.fine0 - (e.clientX - g.x0) / DIAL_PX,
      -MAX_FINE,
      MAX_FINE
    )
    if (Math.abs(fine) < DIAL_SNAP) fine = 0
    const sign = Math.sign(fine)
    if (sign !== g.lastSign && sign === 0) navigator.vibrate?.(6)
    g.lastSign = sign
    this.v.rot = this.turns * 90 + fine
    this.render()
  }

  dialUp(e: PointerEvent) {
    const g = this.gesture
    if (!g || g.kind !== "dial" || g.id !== e.pointerId) return
    this.gesture = null
    this.setInteracting(false)
    this.commit()
  }

  dialKey(e: ReactKeyboardEvent) {
    const step = e.shiftKey ? 5 : 1
    const fine = this.fine()
    let next: number | null = null
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = fine + step
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = fine - step
    if (e.key === "Home") next = 0
    if (e.key === "PageUp") next = fine + 10
    if (e.key === "PageDown") next = fine - 10
    if (next === null) return
    e.preventDefault()
    this.keyChange(() => {
      this.v.rot =
        this.turns * 90 + clamp(Math.round(next!), -MAX_FINE, MAX_FINE)
    })
  }

  /* ---- keyboard on the stage: arrows move, +/- zoom, [ ] straighten ---- */

  stageKey(e: ReactKeyboardEvent) {
    if (!this.ready) return
    const step = e.shiftKey ? 50 : 10
    const moves: Record<string, Vec> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }
    const move = moves[e.key]
    if (move) {
      e.preventDefault()
      this.keyChange(() => {
        const d = rotate(move, -this.v.rot)
        this.v.fx -= d.x / this.v.s
        this.v.fy -= d.y / this.v.s
      })
    } else if (
      e.key === "+" ||
      e.key === "=" ||
      e.key === "-" ||
      e.key === "_"
    ) {
      e.preventDefault()
      const k = e.key === "+" || e.key === "=" ? 1.1 : 1 / 1.1
      this.keyChange(() => {
        this.v.s *= k
      })
    } else if (e.key === "[" || e.key === "]") {
      e.preventDefault()
      const d = (e.key === "]" ? 1 : -1) * (e.shiftKey ? 5 : 1)
      this.keyChange(() => {
        this.v.rot =
          this.turns * 90 +
          clamp(Math.round(this.fine() + d), -MAX_FINE, MAX_FINE)
      })
    }
  }

  /** Keys act at once (no animation on a key press) and commit when they stop. */
  private keyChange(change: () => void) {
    this.stop()
    window.clearTimeout(this.refitTimer)
    // Arrows and zoom move what you see; straightening keeps your zoom underneath.
    this.bake()
    change()
    const r = this.resolve(this.v, "hard")
    this.v.s = r.s
    this.v.fx = r.fx
    this.v.fy = r.fy
    this.render()
    window.clearTimeout(this.settleTimer)
    this.settleTimer = window.setTimeout(() => this.commit(), 300)
  }

  /* ---- toolbar actions ---- */

  /** A quarter turn counterclockwise, frame and all. */
  rotateQuarter() {
    if (!this.ready || this.gesture) return
    window.clearTimeout(this.refitTimer)
    this.stop()
    this.bake()
    const fine = this.fine()
    this.turns -= 1
    const fit = this.fitCrop(this.v.ch, this.v.cw)
    const k = fit.view.cw / this.v.ch
    if (this.aspect !== "free" && this.aspect !== 1) {
      this.aspect = 1 / this.aspect
      this.callbacks.onAspect(this.aspect)
    }
    this.animate(
      { ...fit.view, s: this.v.s * k, rot: this.turns * 90 + fine },
      { duration: 0.45, mode: "raw", onDone: () => this.commit() }
    )
  }

  /** Mirrors left to right as seen, then eases the mirror in like a card. */
  flipHorizontal() {
    if (!this.ready || this.gesture) return
    window.clearTimeout(this.refitTimer)
    this.stop()
    this.bake()
    // Mirroring the screen = mirroring the box and negating the angle.
    this.flipX = !this.flipX
    this.v.fx = -this.v.fx
    this.v.rot = -this.v.rot
    this.turns = -this.turns
    this.v.flip = 180
    this.callbacks.onFlip(this.flipX, this.flipY)
    this.animate(
      { flip: 0 },
      { duration: 0.4, mode: "hard", onDone: () => this.commit() }
    )
  }

  reset() {
    if (!this.ready || this.gesture) return
    window.clearTimeout(this.refitTimer)
    this.stop()
    this.bake()
    this.layoutDefault(true)
  }

  setAspect(aspect: ImageCropAspect, animate: boolean) {
    const changed = aspect !== this.aspect
    this.aspect = aspect
    if (!changed || !this.ready || aspect === "free") return
    window.clearTimeout(this.refitTimer)
    this.stop()
    this.bake()
    // The largest frame of that shape inside the current one, then fit to the stage.
    const size = inscribe(this.v.cw, this.v.ch, aspect)
    const fit = this.fitCrop(size.w, size.h)
    const target = { ...fit.view, s: this.v.s * fit.k }
    if (animate)
      this.animate(target, {
        duration: 0.45,
        mode: "raw",
        onDone: () => this.commit(),
      })
    else {
      Object.assign(this.v, target)
      this.render()
      this.commit()
    }
  }

  setFill(on: boolean) {
    if (on === this.fill) return
    this.fill = on
    if (!this.ready || this.gesture) return
    // Turning it off pulls the photo back over the frame.
    if (!on) this.settle()
  }

  async exportCanvas(
    options: ImageCropperExportOptions = {},
    fills: FillEntry[] = []
  ) {
    const crop = this.getCrop()
    if (!crop || !this.img) throw new Error("The image hasn't loaded yet")
    // The newest fill that covers the whole crop; none when it's all photo.
    const need = fillRegion(crop)
    const fill = this.isUncovered()
      ? fills.findLast((f) => regionContains(f.region, need))
      : undefined
    return cropImage(this.img, crop, {
      maxSize: options.maxSize,
      fill: fill && { image: fill.canvas, region: fill.region },
    })
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.refitTimer)
    window.clearTimeout(this.settleTimer)
  }
}

/** A stable ref callback that hands `name`'s node to the engine. */
function useNode(engine: CropEngine, name: keyof Els) {
  return useCallback(
    (node: HTMLElement | null) => engine.attach(name, node),
    [engine, name]
  )
}

function centroid(pts: Vec[]): Vec {
  const n = pts.length || 1
  return {
    x: pts.reduce((a, p) => a + p.x, 0) / n,
    y: pts.reduce((a, p) => a + p.y, 0) / n,
  }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

type FillStatus =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "error"; message: string; crop: ImageCrop }

const HANDLES: {
  ex: -1 | 0 | 1
  ey: -1 | 0 | 1
  label: string
  cursor: string
}[] = [
  { ex: -1, ey: -1, label: "top left", cursor: "nwse-resize" },
  { ex: 1, ey: -1, label: "top right", cursor: "nesw-resize" },
  { ex: 1, ey: 1, label: "bottom right", cursor: "nwse-resize" },
  { ex: -1, ey: 1, label: "bottom left", cursor: "nesw-resize" },
  { ex: 0, ey: -1, label: "top", cursor: "ns-resize" },
  { ex: 1, ey: 0, label: "right", cursor: "ew-resize" },
  { ex: 0, ey: 1, label: "bottom", cursor: "ns-resize" },
  { ex: -1, ey: 0, label: "left", cursor: "ew-resize" },
]

export function ImageCropper({
  src,
  value,
  onValueChange,
  aspect: aspectProp,
  onAspectChange,
  generateFill,
  fill: fillProp,
  onFillChange,
  ref,
  className,
  ...props
}: ImageCropperProps) {
  const [engine] = useState(() => new CropEngine())
  const [aspectState, setAspectState] = useState<ImageCropAspect>("free")
  const aspect = aspectProp ?? aspectState
  const [fillState, setFillState] = useState(false)
  const fillOn = Boolean(generateFill) && (fillProp ?? fillState)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [backdrop, setBackdrop] = useState<string | null>(null)
  const [flip, setFlip] = useState({ x: false, y: false })
  const [fills, setFills] = useState<FillEntry[]>([])
  const [status, setStatus] = useState<FillStatus>({ kind: "idle" })

  const lastEmitted = useRef<ImageCrop | null>(null)
  const cache = useRef(new Map<string, FillEntry>())
  const request = useRef<AbortController | null>(null)
  const fillTimer = useRef(0)
  const fillCount = useRef(0)

  const generate = useCallback(
    async (crop: ImageCrop) => {
      const img = engine.img
      if (!img || !generateFill) return
      request.current?.abort()
      const controller = new AbortController()
      request.current = controller
      setStatus({ kind: "generating" })
      try {
        // A little more than the crop needs, so nudges reuse it.
        const region = fillRegion(crop, 0.2)
        const read = await generateRegionFill(
          img,
          crop,
          region,
          generateFill,
          controller.signal
        )
        if (controller.signal.aborted) return
        const entry: FillEntry = {
          key: `${src}|${++fillCount.current}`,
          region,
          ...read,
        }
        cache.current.set(entry.key, entry)
        if (controller.signal.aborted) return
        setFills((list) => [...list.slice(-1), entry])
        setStatus({ kind: "idle" })
      } catch (error) {
        if (controller.signal.aborted) return
        const message =
          error instanceof ImageFillError
            ? error.message !== error.code
              ? error.message
              : error.code === "unconfigured"
                ? "AI fill isn't available here."
                : "Couldn't fill the edges."
            : "Couldn't fill the edges."
        setStatus({ kind: "error", message, crop })
      }
    },
    [engine, generateFill, src]
  )

  /** After a crop settles: fill it if any part is past the photo, from cache when we can. */
  const scheduleFill = useCallback(
    (crop: ImageCrop) => {
      window.clearTimeout(fillTimer.current)
      if (!engine.fill || !generateFill || !engine.isUncovered()) {
        request.current?.abort()
        setStatus({ kind: "idle" })
        return
      }
      // Any fill already covering this crop serves it, whatever the angle.
      const need = fillRegion(crop)
      const hit = [...cache.current.values()]
        .reverse()
        .find((f) => regionContains(f.region, need))
      if (hit) {
        request.current?.abort()
        setFills((list) =>
          list.at(-1)?.key === hit.key ? list : [...list.slice(-1), hit]
        )
        setStatus({ kind: "idle" })
        return
      }
      fillTimer.current = window.setTimeout(
        () => generate(crop),
        FILL_DEBOUNCE_MS
      )
    },
    [engine, generate, generateFill]
  )

  // The engine reports back through the latest callbacks.
  useEffect(() => {
    engine.setCallbacks({
      onCommit: (crop) => {
        if (!cropsEqual(crop, lastEmitted.current)) {
          lastEmitted.current = crop
          onValueChange?.(crop)
        }
        scheduleFill(crop)
      },
      onFlip: (x, y) => setFlip({ x, y }),
      onAspect: (next) => {
        if (aspectProp === undefined) setAspectState(next)
        onAspectChange?.(next)
      },
    })
  })

  useEffect(() => {
    engine.setAspect(aspect, true)
  }, [engine, aspect])

  useEffect(() => {
    engine.setFill(fillOn)
    if (!fillOn) {
      window.clearTimeout(fillTimer.current)
      request.current?.abort()
    }
  }, [engine, fillOn])

  // A controlled value from outside (not the one we just reported).
  useEffect(() => {
    if (!value || cropsEqual(value, lastEmitted.current)) return
    lastEmitted.current = value
    engine.applyCrop(value, engine.ready)
  }, [engine, value])

  // Reduced motion, live.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => engine.setReduced(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [engine])

  // A new photo starts over: no fills, no cache.
  useEffect(() => {
    let cancelled = false
    lastEmitted.current = null
    loadImage(src)
      .then((img) => {
        if (cancelled) return
        setSize({ w: img.naturalWidth, h: img.naturalHeight })
        setBackdrop(edgeExtendedBackdrop(img))
        engine.setImage(img)
      })
      .catch(() => {})
    const entries = cache.current
    return () => {
      cancelled = true
      request.current?.abort()
      for (const entry of entries.values()) URL.revokeObjectURL(entry.url)
      entries.clear()
      setFills([])
    }
  }, [engine, src])

  useEffect(() => () => engine.destroy(), [engine])

  // The stage: its size, the non-passive wheel, and Safari's trackpad gestures.
  const stageRef = useCallback(
    (node: HTMLDivElement | null) => engine.attachStage(node),
    [engine]
  )

  // Fills live in the photo's own plane, so they hold through any turn or flip.
  const visibleFills = fillOn ? fills : []
  const fillOnRef = useRef(fillOn)
  useEffect(() => {
    fillOnRef.current = fillOn
  })

  useImperativeHandle(ref, () => {
    const known = () => (fillOnRef.current ? [...cache.current.values()] : [])
    return {
      toCanvas: (options) => engine.exportCanvas(options, known()),
      toBlob: async (options) =>
        canvasToBlob(
          await engine.exportCanvas(options, known()),
          options?.type,
          options?.quality
        ),
      getCrop: () => engine.getCrop(),
    }
  }, [engine])

  function chooseAspect(next: ImageCropAspect) {
    if (aspectProp === undefined) setAspectState(next)
    onAspectChange?.(next)
  }

  function toggleFill() {
    const next = !fillOn
    if (fillProp === undefined) setFillState(next)
    onFillChange?.(next)
    // Turning it on over a crop that's already past the edges fills it now.
    engine.setFill(next)
    const crop = engine.getCrop()
    if (next && crop) scheduleFill(crop)
  }

  const feather = size ? Math.max(2, Math.min(size.w, size.h) * FEATHER) : 0
  const imageMask: CSSProperties | undefined = fillOn
    ? {
        maskImage: `linear-gradient(to right, transparent, #000 ${feather}px, #000 calc(100% - ${feather}px), transparent), linear-gradient(to bottom, transparent, #000 ${feather}px, #000 calc(100% - ${feather}px), transparent)`,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }
    : undefined

  return (
    <div
      data-slot="image-cropper"
      data-interacting="false"
      ref={useNode(engine, "root")}
      className={cn("group/cropper flex w-full flex-col gap-3", className)}
      {...props}
    >
      <div
        ref={stageRef}
        tabIndex={0}
        role="group"
        aria-roledescription="crop area"
        aria-label="Photo. Drag to move, pinch or Ctrl and scroll to zoom. Arrow keys move, plus and minus zoom, square brackets straighten."
        onPointerDown={(e) => engine.stageDown(e.nativeEvent)}
        onPointerMove={(e) => engine.stageMove(e.nativeEvent)}
        onPointerUp={(e) => engine.stageUp(e.nativeEvent)}
        onPointerCancel={(e) => engine.stageUp(e.nativeEvent)}
        onKeyDown={(e) => engine.stageKey(e)}
        className="relative aspect-[4/3] w-full cursor-grab touch-none overflow-hidden rounded-xl bg-neutral-950 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing sm:aspect-[3/2]"
      >
        <div
          ref={useNode(engine, "wrapper")}
          className={cn(
            "absolute top-0 left-0 size-0 origin-top-left will-change-transform",
            "transition-opacity duration-300 ease-out",
            size ? "opacity-100" : "opacity-0"
          )}
        >
          {fillOn && size && backdrop && (
            <FillBackdrop
              url={backdrop}
              width={size.w}
              height={size.h}
              flip={flip}
            />
          )}
          {fillOn && size && status.kind === "generating" && (
            <FillShimmer width={size.w} height={size.h} />
          )}
          {size &&
            visibleFills.map((entry) => (
              <FillLayer
                key={entry.key}
                entry={entry}
                source={size}
                flip={flip}
                onRevealed={() =>
                  setFills((list) =>
                    list.at(-1)?.key === entry.key ? [entry] : list
                  )
                }
              />
            ))}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={useNode(engine, "image")}
            src={src}
            alt=""
            draggable={false}
            crossOrigin={needsCors(src) ? "anonymous" : undefined}
            style={{ width: size?.w, height: size?.h, ...imageMask }}
            className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left outline-none"
          />
        </div>

        <CropFrame engine={engine} />

        <FillStatusPill
          status={fillOn ? status : { kind: "idle" }}
          onRetry={() => {
            if (status.kind === "error") generate(status.crop)
          }}
        />
      </div>

      <RotationDial engine={engine} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="radiogroup"
          aria-label="Aspect ratio"
          className="flex items-center gap-1"
        >
          {IMAGE_CROP_ASPECTS.map((option) => {
            const active = option.value === aspect
            return (
              <Button
                key={option.label}
                role="radio"
                aria-checked={active}
                size="xs"
                variant={active ? "secondary" : "ghost"}
                onClick={() => chooseAspect(option.value)}
                className={cn(
                  "tabular-nums",
                  !active && "text-muted-foreground"
                )}
              >
                {option.label}
              </Button>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
          {generateFill && (
            <Button
              size="xs"
              variant={fillOn ? "default" : "secondary"}
              aria-pressed={fillOn}
              onClick={toggleFill}
              className="mr-1"
            >
              <SparkleIcon weight={fillOn ? "fill" : "regular"} />
              AI fill
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Rotate 90° left"
            title="Rotate 90° left"
            onClick={() => engine.rotateQuarter()}
          >
            <ArrowCounterClockwiseIcon />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Flip horizontally"
            title="Flip horizontally"
            onClick={() => engine.flipHorizontal()}
          >
            <FlipHorizontalIcon />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Reset"
            title="Reset"
            onClick={() => engine.reset()}
          >
            <ArrowUUpLeftIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The frame: everything outside it dimmed, thirds while you work, and eight
 * handles with 44px hit areas around small visible marks.
 */
function CropFrame({ engine }: { engine: CropEngine }) {
  return (
    <div
      ref={useNode(engine, "frame")}
      className="pointer-events-none absolute top-0 left-0 origin-top-left shadow-[0_0_0_9999px_rgb(10_10_10/0.6)] outline outline-1 -outline-offset-1 outline-white/70"
    >
      {/* Thirds: in fast when you start, out slower when you stop. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-data-[interacting=true]/cropper:opacity-100 group-data-[interacting=true]/cropper:duration-150"
      >
        <span className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
        <span className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
        <span className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
        <span className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
      </div>
      {HANDLES.map((handle) => (
        <CropHandle key={handle.label} engine={engine} {...handle} />
      ))}
    </div>
  )
}

function CropHandle({
  engine,
  ex,
  ey,
  label,
  cursor,
}: {
  engine: CropEngine
  ex: -1 | 0 | 1
  ey: -1 | 0 | 1
  label: string
  cursor: string
}) {
  const corner = ex !== 0 && ey !== 0
  const style: CSSProperties = {
    left: `${((ex + 1) / 2) * 100}%`,
    top: `${((ey + 1) / 2) * 100}%`,
    cursor,
  }
  const down = (e: ReactPointerEvent<HTMLDivElement>) =>
    engine.handleDown(e.nativeEvent, e.currentTarget, ex, ey)
  return (
    <div
      aria-hidden
      data-label={label}
      style={style}
      onPointerDown={down}
      onPointerMove={(e) => engine.handleMove(e.nativeEvent)}
      onPointerUp={(e) => engine.handleUp(e.nativeEvent)}
      onPointerCancel={(e) => engine.handleUp(e.nativeEvent)}
      className="group/handle pointer-events-auto absolute size-11 -translate-x-1/2 -translate-y-1/2 touch-none"
    >
      <span
        className="absolute top-1/2 left-1/2 transition-transform duration-150 ease-out group-active/handle:scale-110"
        style={{ transformOrigin: "0 0" }}
      >
        {corner ? (
          <>
            {/* An L of two 3px bars, sitting on the frame's corner, pointing in. */}
            <span
              className="absolute h-[3px] w-[18px] rounded-full bg-white"
              style={{ left: ex < 0 ? -1.5 : -16.5, top: ey < 0 ? -1.5 : -1.5 }}
            />
            <span
              className="absolute h-[18px] w-[3px] rounded-full bg-white"
              style={{ left: -1.5, top: ey < 0 ? -1.5 : -16.5 }}
            />
          </>
        ) : (
          <span
            className="absolute rounded-full bg-white"
            style={
              ex !== 0
                ? { width: 3, height: 20, left: -1.5, top: -10 }
                : { width: 20, height: 3, left: -10, top: -1.5 }
            }
          />
        )}
      </span>
    </div>
  )
}

/**
 * The straighten dial: a ruler of degrees under a fixed centre mark. Drag it
 * like a tape measure; it holds at level when you pass 0.
 */
function RotationDial({ engine }: { engine: CropEngine }) {
  const ticks = []
  for (let d = -MAX_FINE; d <= MAX_FINE; d++) {
    const major = d % 15 === 0
    const mid = d % 5 === 0
    ticks.push(
      <line
        key={d}
        x1={(d + MAX_FINE) * DIAL_PX + 0.5}
        x2={(d + MAX_FINE) * DIAL_PX + 0.5}
        y1={major ? 0 : mid ? 3 : 6}
        y2={14}
        strokeWidth={1}
        className={
          d === 0
            ? "stroke-foreground"
            : major
              ? "stroke-foreground/50"
              : "stroke-foreground/25"
        }
      />
    )
  }
  return (
    <div
      ref={useNode(engine, "dial")}
      role="slider"
      tabIndex={0}
      aria-label="Straighten"
      aria-valuemin={-45}
      aria-valuemax={45}
      aria-valuenow={0}
      aria-orientation="horizontal"
      onPointerDown={(e) => engine.dialDown(e.nativeEvent, e.currentTarget)}
      onPointerMove={(e) => engine.dialMove(e.nativeEvent)}
      onPointerUp={(e) => engine.dialUp(e.nativeEvent)}
      onPointerCancel={(e) => engine.dialUp(e.nativeEvent)}
      onKeyDown={(e) => engine.dialKey(e)}
      onDoubleClick={() =>
        engine.dialKey({
          key: "Home",
          shiftKey: false,
          preventDefault() {},
        } as ReactKeyboardEvent)
      }
      className="relative mx-auto flex h-12 w-full max-w-sm cursor-ew-resize touch-none flex-col items-center justify-end gap-1.5 rounded-lg outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        ref={useNode(engine, "dialLabel")}
        className="text-xs font-medium tabular-nums"
      >
        0°
      </span>
      <div className="relative h-[18px] w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_25%,#000_75%,transparent)]">
        <div
          ref={useNode(engine, "dialTrack")}
          className="absolute top-0 left-1/2 will-change-transform"
          style={{ transform: `translate3d(${-MAX_FINE * DIAL_PX}px,0,0)` }}
        >
          <svg width={MAX_FINE * 2 * DIAL_PX + 1} height={14} aria-hidden>
            {ticks}
          </svg>
        </div>
        <span
          aria-hidden
          className="absolute top-0 left-1/2 h-[18px] w-0.5 -translate-x-1/2 rounded-full bg-foreground"
        />
      </div>
    </div>
  )
}

/**
 * The optimistic placeholder under a fill: the photo's edge pixels
 * stretched outward and blurred (the same thing the model is sent), locked
 * to the photo's geometry, so the empty parts carry its colours before any
 * new pixels come back.
 */
function FillBackdrop({
  url,
  width,
  height,
  flip,
}: {
  url: string
  width: number
  height: number
  flip: { x: boolean; y: boolean }
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      aria-hidden
      draggable={false}
      className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left outline-none"
      style={{
        width: width * 3,
        height: height * 3,
        transform: `scale(${flip.x ? -1 : 1},${flip.y ? -1 : 1}) translate(-50%,-50%)`,
      }}
    />
  )
}

/**
 * The photo with its edges stretched to three times its size and blurred,
 * small (it's blurred anyway). null when the photo can't be read back
 * (cross-origin without CORS).
 */
function edgeExtendedBackdrop(img: HTMLImageElement) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const k = Math.min(1, 480 / Math.max(w, h))
  const flat = canvas(3 * w * k, 3 * h * k)
  const ctx = flat.getContext("2d")!
  ctx.scale(k, k)
  ctx.translate(w, h)
  edgeExtend(ctx, img, { x: -w, y: -h, width: 3 * w, height: 3 * h })
  const out = canvas(flat.width, flat.height)
  const octx = out.getContext("2d")!
  octx.filter = "blur(14px) saturate(1.1)"
  octx.drawImage(flat, 0, 0)
  try {
    return out.toDataURL("image/jpeg", 0.8)
  } catch {
    return null
  }
}

/**
 * While a fill is on its way: a soft sheen sweeps the empty parts and the
 * placeholder breathes. Reduced motion keeps only the breathing.
 */
function FillShimmer({ width, height }: { width: number; height: number }) {
  const sheen = useRef<HTMLDivElement>(null)
  const glow = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    const animations: Animation[] = []
    if (glow.current) {
      glow.current.animate([{ opacity: 0.35 }, { opacity: 0.8 }], {
        duration: 1100,
        iterations: Infinity,
        direction: "alternate",
        easing: "ease-in-out",
      })
    }
    if (sheen.current && !reduced) {
      animations.push(
        sheen.current.animate(
          [
            { transform: "translate3d(-60%,0,0)" },
            { transform: "translate3d(60%,0,0)" },
          ],
          { duration: 1600, iterations: Infinity, easing: "linear" }
        )
      )
    }
    return () => animations.forEach((a) => a.cancel())
  }, [])
  const W = width * 3
  const H = height * 3
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 overflow-hidden"
      style={{
        width: W,
        height: H,
        transform: `translate(-50%,-50%)`,
        transformOrigin: "0 0",
      }}
    >
      <div ref={glow} className="absolute inset-0 bg-white/10" />
      <div
        ref={sheen}
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(105deg, transparent 42%, rgb(255 255 255 / 0.22) 50%, transparent 58%)",
        }}
      />
    </div>
  )
}

let revealRegistered = false
function registerReveal() {
  if (
    revealRegistered ||
    typeof CSS === "undefined" ||
    !("registerProperty" in CSS)
  )
    return
  revealRegistered = true
  try {
    CSS.registerProperty({
      name: "--ic-reveal",
      syntax: "<percentage>",
      inherits: false,
      initialValue: "140%",
    })
  } catch {
    // Already registered by another copy: fine.
  }
}

/**
 * A generated fill, placed where it was made: in the photo's own frame, so
 * it moves, turns and scales with the photo. It resolves in from the
 * photo's edges outward, blurred to sharp. The photo sits on top of it with
 * feathered edges, so only the new pixels show.
 */
function FillLayer({
  entry,
  source,
  flip,
  onRevealed,
}: {
  entry: FillEntry
  source: { w: number; h: number }
  flip: { x: boolean; y: boolean }
  onRevealed: () => void
}) {
  const el = useRef<HTMLImageElement>(null)
  const done = useRef(onRevealed)
  useEffect(() => {
    done.current = onRevealed
  })
  const { region } = entry
  useEffect(() => {
    const node = el.current
    if (!node) return
    registerReveal()
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    const blur = Math.max(region.width, region.height) * 0.02
    const run = () => {
      const animation = reduced
        ? node.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 250,
            easing: "ease-out",
            fill: "both",
          })
        : node.animate(
            [
              { opacity: 0, filter: `blur(${blur}px)`, "--ic-reveal": "0%" },
              { opacity: 1, filter: "blur(0px)", "--ic-reveal": "140%" },
            ],
            { duration: 700, easing: EASE_OUT, fill: "both" }
          )
      animation.finished.then(() => done.current()).catch(() => {})
    }
    if (node.complete) run()
    else node.addEventListener("load", run, { once: true })
  }, [region])
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={el}
      src={entry.url}
      alt=""
      aria-hidden
      draggable={false}
      className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left outline-none"
      style={{
        width: region.width,
        height: region.height,
        opacity: 0,
        // Source pixels to the photo's centred frame, mirrored like the photo.
        transform: `scale(${flip.x ? -1 : 1},${flip.y ? -1 : 1}) translate(${region.x - source.w / 2}px,${region.y - source.h / 2}px)`,
        maskImage:
          "radial-gradient(farthest-corner at 50% 50%, #000 calc(var(--ic-reveal) - 40%), transparent var(--ic-reveal))",
      }}
    />
  )
}

/** "Filling…" while it works; what went wrong, with a retry, when it fails. */
function FillStatusPill({
  status,
  onRetry,
}: {
  status: FillStatus
  onRetry: () => void
}) {
  const visible = status.kind !== "idle"
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-[opacity,translate] duration-200 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      )}
    >
      {status.kind === "generating" && (
        <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
          <SparkleIcon weight="fill" className="size-3.5 animate-pulse" />
          Filling the edges…
        </span>
      )}
      {status.kind === "error" && (
        <span className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/70 py-1 pr-1 pl-3 text-xs text-white backdrop-blur-md">
          {status.message}
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-white/15 px-2.5 py-1 font-medium transition-[background-color,scale] duration-150 ease-out hover:bg-white/25 active:scale-[0.96]"
          >
            Try again
          </button>
        </span>
      )}
    </div>
  )
}
