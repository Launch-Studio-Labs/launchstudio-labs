"use client"

import { useRef, useState, type ComponentProps } from "react"
import { DownloadSimpleIcon } from "@phosphor-icons/react"

import { DemoFrame } from "@/components/demos/demo-frame"
import { Button } from "@/components/ui/button"
import {
  ImageCropper,
  ImageFillError,
  type ImageCropperHandle,
  type ImageFillGenerate,
} from "@/components/ui/image-cropper"
import { cn } from "@/lib/utils"

/**
 * Photo by Alexey Topolyanskiy on Unsplash (Unsplash License): a crop of the
 * full frame, which is IMAGE_CROPPER_WIDE.
 */
export const IMAGE_CROPPER_PHOTO = "/images/fjord.jpg"

/**
 * The full photo the demo crop was cut from, and where it sits on the demo
 * photo's plane (source px of fjord.jpg). The stand-in fill reveals it.
 */
const IMAGE_CROPPER_WIDE = {
  src: "/images/fjord-wide.jpg",
  x: -654.55,
  y: -436.36,
  width: 2909.09,
  height: 1939.2,
}

/**
 * AI fill through this site's own route (app/api/image-fill). The key lives
 * on the server; the browser only ever sees pictures.
 */
async function serverFill({
  image,
  mask,
  width,
  height,
  signal,
}: Parameters<ImageFillGenerate>[0]) {
  const form = new FormData()
  form.set("image", image, "image.png")
  form.set("mask", mask, "mask.png")
  form.set("size", `${width}x${height}`)
  const res = await fetch("/api/image-fill", {
    method: "POST",
    body: form,
    signal,
  })
  // 503: no OPENAI_API_KEY. 404, 405 or 501, or a page instead of a
  // picture: a static host, so no route at all.
  const isImage = res.headers.get("content-type")?.startsWith("image/")
  if ([404, 405, 501, 503].includes(res.status) || (res.ok && !isImage)) {
    throw new ImageFillError("unconfigured")
  }
  if (!res.ok) throw new ImageFillError("failed")
  return res.blob()
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      window.clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve()
    }, ms)
    signal.addEventListener("abort", abort, { once: true })
  })
}

let widePhoto: Promise<HTMLImageElement> | null = null
function loadWidePhoto() {
  widePhoto ??= new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      widePhoto = null
      reject(new ImageFillError("failed"))
    }
    img.src = IMAGE_CROPPER_WIDE.src
  })
  return widePhoto
}

/**
 * A stand-in for the model, so anyone can try AI fill here: it answers the
 * same request with the rest of the original photo, after a short wait.
 * Past the full photo, the request's blurred placeholder shows through.
 */
async function standInFill({
  image,
  width,
  height,
  region,
  signal,
}: Parameters<ImageFillGenerate>[0]) {
  const [wide, placeholder] = await Promise.all([
    loadWidePhoto(),
    createImageBitmap(image),
    wait(1600, signal),
  ])
  const out = document.createElement("canvas")
  out.width = width
  out.height = height
  const ctx = out.getContext("2d")!
  ctx.drawImage(placeholder, 0, 0)
  placeholder.close()
  // The request letterboxes the region into the frame, centred.
  const k = Math.min(width / region.width, height / region.height)
  const ox = (width - region.width * k) / 2
  const oy = (height - region.height * k) / 2
  const w = IMAGE_CROPPER_WIDE
  ctx.drawImage(
    wide,
    ox + (w.x - region.x) * k,
    oy + (w.y - region.y) * k,
    w.width * k,
    w.height * k
  )
  return new Promise<Blob>((resolve, reject) =>
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageFillError("failed"))),
      "image/png"
    )
  )
}

/** Once the route says it can't fill, the rest of the visit uses the stand-in. */
let useStandIn = false

const generateFill: ImageFillGenerate = async (request) => {
  if (!useStandIn) {
    try {
      return await serverFill(request)
    } catch (error) {
      if (!(error instanceof ImageFillError && error.code === "unconfigured")) {
        throw error
      }
      useStandIn = true
    }
  }
  return standInFill(request)
}

/**
 * The cropper as it ships, with AI fill wired to the server route, and an
 * export under it to prove the crop comes out at full size.
 */
export function ImageCropperDemo({
  className,
  ...props
}: ComponentProps<"div">) {
  const cropper = useRef<ImageCropperHandle>(null)
  const [result, setResult] = useState<{
    url: string
    width: number
    height: number
  } | null>(null)
  const [exporting, setExporting] = useState(false)

  async function exportCrop() {
    if (!cropper.current) return
    setExporting(true)
    try {
      const canvas = await cropper.current.toCanvas()
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      )
      if (!blob) return
      setResult((previous) => {
        if (previous) URL.revokeObjectURL(previous.url)
        return {
          url: URL.createObjectURL(blob),
          width: canvas.width,
          height: canvas.height,
        }
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      className={cn("flex w-content max-w-full flex-col gap-6", className)}
      {...props}
    >
      <DemoFrame className="w-full min-w-0! items-stretch p-4 sm:p-6">
        <div className="flex w-full flex-col gap-4 rounded-xl bg-card p-3 shadow-xs ring-1 ring-foreground/5 sm:p-4">
          <ImageCropper
            ref={cropper}
            src={IMAGE_CROPPER_PHOTO}
            generateFill={generateFill}
          />
        </div>
      </DemoFrame>

      <p className="-mt-3 text-xs text-muted-foreground">
        AI fill on this page is a stand-in: it shows the rest of the original
        photo. With a server and OPENAI_API_KEY, an image model paints it.
      </p>

      {/* A fixed-height row, so the result appearing never moves the page. */}
      <div className="flex h-12 items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={exportCrop}
          disabled={exporting}
          className="gap-1.5 pr-3 pl-2.5 text-xs"
        >
          <DownloadSimpleIcon />
          Export
        </Button>
        {result && (
          <a
            href={result.url}
            download="crop.jpg"
            className="flex min-w-0 items-center gap-3 rounded-md text-xs text-muted-foreground tabular-nums"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.url}
              alt="The exported crop"
              className="h-12 w-auto max-w-24 rounded-md object-contain"
            />
            <span className="truncate">
              {result.width} × {result.height} px
            </span>
          </a>
        )}
      </div>
    </div>
  )
}
