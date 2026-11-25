# Image Cropper: the component (Phase 3, step 2)

## Basic use

```tsx
import { useRef } from "react"
import { ImageCropper, type ImageCropperHandle } from "@/components/ui/image-cropper"

const cropper = useRef<ImageCropperHandle>(null)

<ImageCropper ref={cropper} src={objectUrl} aspect={1} />

const blob = await cropper.current!.toBlob({ maxSize: 1024, type: "image/jpeg", quality: 0.9 })
```

`src` can be an object URL from a file input (`URL.createObjectURL(file)`),
a data URL, or a same-origin path. A cross-origin URL needs CORS headers or
the export fails (the canvas is tainted). Revoke object URLs when done.

The component is `w-full` and sets its own stage height (4:3, 3:2 from
`sm`). Put it in a dialog or a card; give it at least 320px of width.

## Props

| Prop | Use |
| --- | --- |
| `src` | the photo |
| `value` / `onValueChange` | the crop as `ImageCrop`, in source pixels. Controlled when `value` is set. `onValueChange` fires when a gesture settles, not per frame. |
| `aspect` / `onAspectChange` | `"free"` or width over height. A quarter turn swaps it (4:5 to 5:4) and reports through `onAspectChange`. |
| `generateFill` | turns on the AI fill switch. `(request) => Promise<Blob or URL>` |
| `fill` / `onFillChange` | controlled AI fill switch |
| `ref` | `toBlob(options)`, `toCanvas(options)`, `getCrop()` |

Everything else goes to the root `div`.

## Saving a crop for later

Keep the `ImageCrop` from `onValueChange` and crop the original later, at
full size, without the component:

```ts
import { cropImage } from "@/components/ui/image-cropper"
const canvas = await cropImage(originalUrl, crop, { maxSize: 4096 })
```

## Errors from generateFill

Throw `new ImageFillError("unconfigured", message?)` when the server has no
key or no route, and `new ImageFillError("failed", message?)` for anything
else. The stage shows the message with a "Try again" button. Aborted
requests (a newer crop replaced them) are ignored; pass `signal` to `fetch`.

## Verification checklist

- Drag the dial to 30 degrees: no empty corner at any angle; back to 0, the
  zoom returns to where it was.
- Drag the photo past an edge: it rubber-bands and springs back.
- Resize the frame from a corner and an edge; with an aspect set, the shape
  holds. After a moment the frame grows back to fill the stage.
- Pinch and two-finger rotate on a phone; Ctrl plus scroll on a trackpad.
- Keyboard: Tab to the stage, arrows move, plus and minus zoom, square
  brackets straighten. Tab to the dial, arrows turn it.
- Quarter turn, flip, reset, aspect presets.
- Export: the file has the crop's size (or `maxSize`) and looks like the
  frame.
- With AI fill: zoom out past the edges, let go, the empty parts shimmer
  and then fill; without a key, the stage says so and nothing breaks.
- Reduced motion: no springs or sheen, everything lands at once.
