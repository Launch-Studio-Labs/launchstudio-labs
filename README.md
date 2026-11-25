# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Dictation Input

A normal text input or textarea with a microphone in its corner — the
layout of the Launch Studio portal's voice answers. People type as usual;
pressing the mic records (Voice Glow along the field, "Listening", the timer
and the mic picker underneath), and the transcript is written into the same
field.
Afterwards the corner button resets the answer with a confirm, a recap player
sits under the field, and a line inside the field lets people stop their
recordings being sent. Docs and playground:
https://labs.launchstudio.space/dictation-input (`/playground/dictation-input` for
the bare demo).

```tsx
// Wrap the field your form already has: Input or Textarea.
<DictationInput value={name} onValueChange={setName} onTranscribe={transcribe}>
  <Input value={name} onChange={(e) => setName(e.target.value)} />
</DictationInput>
```

**Installation → Prompt (the default tab).** The docs page has a **Copy prompt**
button. Paste the prompt into a coding agent: it points the agent at the
skill (`/skills/dictation-input/SKILL.md`) and the registry item
(`/r/dictation-input.json`), and the agent scans your repo, sends you a short
plan (registry or manual install, which fields, transcription, recordings
and privacy, env vars) and waits for your OK — then installs the component
and implements the frontend and backend. Nothing changes until you approve.

```text
Add the Dictation Input component from Launch Studio Labs to my app.

Skill (follow it): https://labs.launchstudio.space/skills/dictation-input/SKILL.md

Component (shadcn registry item): https://labs.launchstudio.space/r/dictation-input.json
```

The page builds the URLs from the host it is served on, so a pull-request
preview copies that preview's skill and registry URLs.

**Or install it yourself** through the registry:

```bash
npx shadcn@latest add https://labs.launchstudio.space/r/dictation-input.json
# a pull-request preview serves the same item at <preview-origin>/r/dictation-input.json
```

Or by hand: `npm install voice-glow @phosphor-icons/react`,
`npx shadcn@latest add button dropdown-menu popover`, then copy
`components/ui/dictation-input.tsx`, `components/ui/voice-waveform.tsx`,
`hooks/use-voice-recorder.ts` and `lib/voice-recording.ts`.

Optional looks: `fieldEffect` draws the voice inside the field (`glow`,
`level`, `dots`), each with its own motion while
transcribing; `buttonRadius` is `"auto"` (visually concentric with the
field: `min(R, max(R − inset, R / 2, 5px), button / 2)`), `"full"` or px.

To keep the skill in your agent instead:
`npx skills add https://github.com/Launch-Studio-Labs/launchstudio-labs/tree/main/skills/dictation-input`.
Its `references/` hold the details for doing it by hand too:
`install.md`, `component.md` (wiring, props, permissions), `server.md`
(OpenAI transcription route, storage, deleting audio, "don't send
recordings" end to end) and `scan.md`.

The glow is [Voice Glow](https://libraries.dev/voice) by Jakub Antalik, MIT
License, Copyright (c) 2026 Jakub Antalik — see `THIRD_PARTY_NOTICES.md`.

## Image Cropper

Crop, straighten, turn and flip a photo, and never see an empty corner.
While the photo turns, it scales up just enough to cover the crop frame
(the smallest scale at which the frame, turned into the photo's axes, fits
inside it), and its position is clamped so the frame stays on the photo.
Turn it back and it returns to your zoom. Drag handles, aspect presets
(free, 1:1, 4:5, 16:9), a straighten dial (plus or minus 45 degrees), quarter
turns, flip, reset; pinch, two-finger rotate, Ctrl and scroll, and keys.
Export with `ref.current.toBlob()`. Docs and playground:
https://labs.launchstudio.space/image-cropper (`/playground/image-cropper`).

```tsx
<ImageCropper ref={cropper} src={photo} onValueChange={setCrop} />
```

**AI fill** (optional): pass `generateFill` and an "AI fill" switch appears.
With it on, you can zoom out or turn past the photo's edges, up to a quarter
of its short side on each side; when you let go
the empty parts shimmer, an image model on your server fills them, and they
resolve in under the photo. The demo wires it to `app/api/image-fill`
(OpenAI image edits, `OPENAI_API_KEY` on the server, `OPENAI_IMAGE_MODEL`
defaults to `gpt-image-2`, `OPENAI_IMAGE_QUALITY` to `low`). That route is
named `route.server.ts` so only the server build includes it; the static
preview export has no server and says so in the demo.

Install with the prompt on the docs page, or
`npx shadcn@latest add https://labs.launchstudio.space/r/image-cropper.json`.
The skill is `skills/image-cropper/` (`server.md` has the fill route).

The demo photo is by Alexey Topolyanskiy on Unsplash (Unsplash License).
