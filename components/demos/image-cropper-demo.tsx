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

/** Photo by Alexey Topolyanskiy on Unsplash (Unsplash License). */
export const IMAGE_CROPPER_PHOTO = "/images/fjord.jpg"

/**
 * AI fill through this site's own route (app/api/image-fill). The key lives
 * on the server; the browser only ever sees pictures.
 */
const generateFill: ImageFillGenerate = async ({
  image,
  mask,
  width,
  height,
  signal,
}) => {
  const form = new FormData()
  form.set("image", image, "image.png")
  form.set("mask", mask, "mask.png")
  form.set("size", `${width}x${height}`)
  const res = await fetch("/api/image-fill", {
    method: "POST",
    body: form,
    signal,
  })
  if (res.status === 503) {
    throw new ImageFillError(
      "unconfigured",
      "AI fill needs OPENAI_API_KEY on the server."
    )
  }
  // The static preview has no server, so no route: it answers 404 or 405.
  if (res.status === 404 || res.status === 405) {
    throw new ImageFillError(
      "unconfigured",
      "AI fill needs a server. This preview is static."
    )
  }
  if (!res.ok) throw new ImageFillError("failed")
  return res.blob()
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
