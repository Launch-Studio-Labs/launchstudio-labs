"use client"

import { CodeBlock, Command } from "@/components/code-block"
import { ImageCropperDemo } from "@/components/demos/image-cropper-demo"
import {
  ApiTable,
  propTable,
  type ApiRow,
} from "@/components/docs/api-reference"
import { CopyPromptButton, PromptCard } from "@/components/docs/prompt-card"
import { Code, Section } from "@/components/docs/section"
import { Steps } from "@/components/docs/steps"
import { PageHeader } from "@/components/page-header"
import { Prose } from "@/components/prose"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  ImageCrop,
  ImageCropperHandle,
  ImageCropperOwnProps,
} from "@/components/ui/image-cropper"
import { useRegistryOrigin } from "@/lib/use-registry-origin"

const REPO = "https://github.com/Launch-Studio-Labs/launchstudio-labs/blob/main"
const FILE = "components/ui/image-cropper.tsx"
const SKILL_SERVER = "/skills/image-cropper/references/server.md"

const LINK =
  "font-medium text-foreground underline decoration-foreground/20 underline-offset-2 hover:decoration-foreground/60"

const USAGE = `import { useRef } from "react"
import {
  ImageCropper,
  ImageFillError,
  type ImageCropperHandle,
  type ImageFillGenerate,
} from "@/components/ui/image-cropper"

const cropper = useRef<ImageCropperHandle>(null)

<ImageCropper ref={cropper} src={photo} onValueChange={setCrop} />

// Export what the frame shows, at full resolution.
const blob = await cropper.current.toBlob({ type: "image/jpeg", quality: 0.9 })

// Optional: AI fill, through your own server route.
const generateFill: ImageFillGenerate = async ({ image, mask, width, height, signal }) => {
  const form = new FormData()
  form.set("image", image, "image.png")
  form.set("mask", mask, "mask.png")
  form.set("size", \`\${width}x\${height}\`)
  const res = await fetch("/api/image-fill", { method: "POST", body: form, signal })
  if (res.status === 503) throw new ImageFillError("unconfigured")
  if (!res.ok) throw new ImageFillError("failed")
  return res.blob()
}

<ImageCropper src={photo} generateFill={generateFill} />`

function buildPrompt(origin: string) {
  return `Add the Image Cropper component from Launch Studio Labs to my app.

Skill (follow it): ${origin}/skills/image-cropper/SKILL.md

Component (shadcn registry item): ${origin}/r/image-cropper.json`
}

/** How the component behaves, in the order a person meets it. */
const HOW_IT_WORKS = [
  {
    title: "Crop",
    body: "Drag a corner or an edge to crop. Pick a shape, or keep it free. When you let go, the frame grows back to fill the space and the photo zooms with it.",
  },
  {
    title: "Straighten without empty corners",
    body: "Drag the dial to turn the photo, up to 45° each way. The photo grows just enough to cover the frame, so the corners are never empty. Turn it back and it returns to your zoom.",
  },
  {
    title: "Move and zoom",
    body: "Drag to move. Pinch, or hold Ctrl and scroll, to zoom. Twist two fingers to turn. Past an edge it gives a little, then springs back. Keys work too: arrows, plus and minus, and the square brackets.",
  },
  {
    title: "Fill past the edges with AI",
    body: "Turn on AI fill to zoom out or turn past the photo, up to a quarter of its short side on each side. When you let go, an image model on your server paints the empty parts, and they fade in from the photo's edges.",
  },
]

const SKILL_STEPS = [
  {
    title: "Scans your repo",
    body: "Reads your shadcn setup, where photos are uploaded or edited, your API and hosting, and any image model you already use. Changes nothing.",
  },
  {
    title: "Asks for your OK",
    body: "Sends a short plan: registry or manual install, where the cropper goes, what happens to the exported image, and whether to add AI fill. Then waits.",
  },
  {
    title: "Implements it",
    body: "Installs the component, wires it into your upload flow, builds the AI fill route if you want it, and checks it works.",
  },
]

/** The component's own props, every one listed. */
const IMAGE_CROPPER_ROWS = propTable<keyof ImageCropperOwnProps>()([
  {
    prop: "src",
    type: "string",
    description:
      "Required. The photo. A photo from another origin needs CORS headers to export.",
  },
  {
    prop: "value",
    type: "ImageCrop",
    description: "Controlled crop. Leave it out and the cropper keeps its own.",
  },
  {
    prop: "onValueChange",
    type: "(crop: ImageCrop) => void",
    description: "A gesture settled. Called once per change, not every frame.",
  },
  {
    prop: "aspect",
    type: '"free" | number',
    default: '"free"',
    description: "The frame's shape: width over height, or free.",
  },
  {
    prop: "onAspectChange",
    type: "(aspect: ImageCropAspect) => void",
    description:
      "The person picked a shape, or a quarter turn swapped it (4:5 becomes 5:4).",
  },
  {
    prop: "generateFill",
    type: "ImageFillGenerate",
    description:
      "Fills the parts of the frame past the photo: (request) => Blob or URL. Shows the AI fill switch. Leave it out for no AI.",
  },
  {
    prop: "fill",
    type: "boolean",
    default: "false",
    description: "Controlled AI fill switch.",
  },
  {
    prop: "onFillChange",
    type: "(fill: boolean) => void",
    description: "The person flipped the AI fill switch.",
  },
  {
    prop: "ref",
    type: "Ref<ImageCropperHandle>",
    description: "Export the crop: toBlob, toCanvas and getCrop.",
  },
])

const CROP_ROWS = propTable<keyof ImageCrop>()([
  {
    prop: "x",
    type: "number",
    description: "Centre of the crop from the photo's left, in source pixels.",
  },
  {
    prop: "y",
    type: "number",
    description: "Centre of the crop from the photo's top, in source pixels.",
  },
  {
    prop: "width",
    type: "number",
    description: "Width in source pixels. The exported image's width.",
  },
  {
    prop: "height",
    type: "number",
    description: "Height in source pixels. The exported image's height.",
  },
  {
    prop: "rotation",
    type: "number",
    description:
      "Degrees clockwise, quarter turns included: 93.5 is a quarter turn and 3.5°.",
  },
  {
    prop: "flipX",
    type: "boolean",
    description: "Mirrored left to right, as seen in the frame.",
  },
  {
    prop: "flipY",
    type: "boolean",
    description: "Mirrored top to bottom, as seen in the frame.",
  },
])

const HANDLE_ROWS = propTable<keyof ImageCropperHandle>()([
  {
    prop: "toBlob",
    type: "(options?) => Promise<Blob>",
    description:
      "The crop as an image file. Options: maxSize (longest side), type, quality.",
  },
  {
    prop: "toCanvas",
    type: "(options?) => Promise<HTMLCanvasElement>",
    description: "The same, as a canvas, to draw on or upload your own way.",
  },
  {
    prop: "getCrop",
    type: "() => ImageCrop | null",
    description: "The crop right now. null until the photo loads.",
  },
])

/** The public API, in the order people reach for it. */
const API: { name: string; description: string; rows: readonly ApiRow[] }[] = [
  {
    name: "ImageCropper",
    description:
      "The stage, the straighten dial and the toolbar. Every other prop goes to the root element.",
    rows: IMAGE_CROPPER_ROWS,
  },
  {
    name: "ImageCrop",
    description:
      "A crop in the photo's own pixels, so the same value crops the full-size original. cropImage(src, crop) renders it without the component.",
    rows: CROP_ROWS,
  },
  {
    name: "ImageCropperHandle",
    description: "What ref gives you.",
    rows: HANDLE_ROWS,
  },
  {
    name: "ImageFillError",
    description: "Throw it from generateFill to show the right message.",
    rows: [
      {
        prop: "code",
        type: '"unconfigured" | "failed"',
        description:
          '"unconfigured": no key or no route on the server. "failed": anything else; the message offers to try again.',
      },
      {
        prop: "message",
        type: "string",
        description: "Optional. Replaces the default message on the stage.",
      },
    ],
  },
]

export function ImageCropperShowcase({ skill }: { skill: string }) {
  const origin = useRegistryOrigin()
  const registryCommand = `npx shadcn@latest add ${origin}/r/image-cropper.json`
  const prompt = buildPrompt(origin)

  return (
    <>
      <div className="labs-enter labs-enter-delay-1 flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <PageHeader
            href="/image-cropper"
            animated={false}
            action={
              <CopyPromptButton prompt={prompt} variant="secondary">
                Add with a prompt
              </CopyPromptButton>
            }
          />
          <p className="text-sm leading-normal text-pretty text-body">
            A photo cropper with a straighten dial. When you turn the photo, it
            grows just enough to cover the frame, so you never see an empty
            corner. With AI fill on, you can go a little past the edges and an
            image model fills in the rest.
          </p>
        </header>
        <ImageCropperDemo />
        <Steps steps={HOW_IT_WORKS} />
      </div>

      <Separator className="labs-enter labs-enter-delay-3" />

      <Section title="Installation" className="labs-enter labs-enter-delay-3">
        <Tabs defaultValue="prompt" className="gap-6">
          <TabsList>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="registry">shadcn registry</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="prompt" className="flex flex-col gap-8">
            <Prose>
              <p>
                Copy this into your coding agent. It points the agent at the
                Image Cropper skill and the component, and the agent does the
                rest.
              </p>
            </Prose>
            <Steps steps={SKILL_STEPS} />
            <PromptCard prompt={prompt} skill={skill} />
          </TabsContent>
          <TabsContent value="registry" className="flex flex-col gap-3">
            <Command text={registryCommand} />
            <Prose>
              <p>
                Adds <Code>{FILE}</Code>, installs the Phosphor icons, and pulls
                in shadcn&apos;s <Code>button</Code> if you don&apos;t have it.
                AI fill also needs a server route; see{" "}
                <a href={SKILL_SERVER} className={LINK}>
                  the server notes
                </a>
                .
              </p>
            </Prose>
          </TabsContent>
          <TabsContent value="manual">
            <Steps
              className="gap-6"
              steps={[
                {
                  title: "Install the icons",
                  body: <Command text="npm install @phosphor-icons/react" />,
                },
                {
                  title: "Add the shadcn button",
                  body: <Command text="npx shadcn@latest add button" />,
                },
                {
                  title: "Copy the file",
                  body: (
                    <>
                      <p className="font-mono text-xs">
                        <a href={`${REPO}/${FILE}`} className={LINK}>
                          {FILE}
                        </a>
                      </p>
                      <p>
                        It imports from <Code>@/components/ui</Code> and{" "}
                        <Code>@/lib/utils</Code>. Change the paths if your
                        aliases differ.
                      </p>
                    </>
                  ),
                },
                {
                  title: "For AI fill, add the server route",
                  body: (
                    <p>
                      A route that sends the image and mask to an image model.
                      The OpenAI version is in{" "}
                      <a href={SKILL_SERVER} className={LINK}>
                        the server notes
                      </a>
                      . The key stays on the server.
                    </p>
                  ),
                },
              ]}
            />
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Usage" className="labs-enter labs-enter-delay-3">
        <CodeBlock code={USAGE} />
      </Section>

      <Section title="API Reference" className="labs-enter labs-enter-delay-3">
        {API.map((part) => (
          <ApiTable key={part.name} {...part} />
        ))}
      </Section>

      <Section title="Credit" className="labs-enter labs-enter-delay-3">
        <Prose>
          <p>
            The idea comes from{" "}
            <a
              href="https://x.com/pqoqubbw/status/2125264344787325295"
              className={LINK}
            >
              a post by @pqoqubbw
            </a>
            : rotating a photo should never show empty corners. The fjord photo
            is by{" "}
            <a href="https://unsplash.com/photos/-oWyJoSqBRM" className={LINK}>
              Alexey Topolyanskiy
            </a>{" "}
            on Unsplash, under the Unsplash License.
          </p>
        </Prose>
      </Section>
    </>
  )
}
