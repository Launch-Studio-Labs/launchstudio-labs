---
name: voice-input
description: Install and wire up the Launch Studio Labs Voice Input component (shadcn) — record/stop/pause, live and playback waveforms, mic picker, permissions, transcription through your own server (OpenAI pattern), and the "don't send recordings" privacy choice end to end, including deleting stored audio. Use when adding voice input, voice notes, dictation or spoken answers to a React/Next.js app.
---

# Voice Input

A shadcn-style React component that puts a **microphone in the corner of a
normal text field**. The field stays a field — people type into it as usual —
and voice is the extra:

- Idle: an `Input` or `Textarea` with a small round mic button top-right.
- Recording: the button becomes stop, Voice Glow plays along the field, and
  a line under the field shows a level meter, "Listening", the clock and a
  mic picker.
- Processing: spinner in the corner, "Writing your answer…" under the field.
- Done: the transcript is written into the same field. The corner button
  becomes reset (with a confirm), a recap player sits under the field, and a
  line pinned inside the field says whether recordings are sent, with a link
  to turn that off.

It is the layout of the Launch Studio portal's voice answers (`VoiceMic` in
the portal), with neutral colours. You hook it to your backend with
`onTranscribe` (send a take, get text back) and `onDeleteRecording` (forget
stored audio).

**Don't build a standalone recorder** (a big record button, a pill or a panel
that replaces the text field) as the default. Put the mic on the field the
form already has.

Live docs and playground: https://labs.launchstudio.space/voice-input
Source: https://github.com/Launch-Studio-Labs/launchstudio-labs (files listed below)

Read this whole file before you start. The privacy section is not optional.

## 1. Install

The component needs a React app with Tailwind v4 and shadcn/ui set up
(`components.json`, the `cn` helper in `@/lib/utils`). It works with either
the Radix or the Base UI flavour of shadcn: it only uses `Button`,
`DropdownMenu` and `Popover` from your own `components/ui`.

### Option A — shadcn registry (recommended)

```bash
npx shadcn@latest add https://labs.launchstudio.space/r/voice-input.json
```

That writes four files, installs `voice-glow` and `@phosphor-icons/react`,
and adds shadcn's `button`, `dropdown-menu` and `popover` if they are missing.

To try a pull-request build before it ships, use the preview Worker's origin
instead; the path is the same:

```bash
npx shadcn@latest add https://cursor-voice-input-launchstudio-labs.launch-studio.workers.dev/r/voice-input.json
```

(Any Labs preview host serves the registry at `<origin>/r/voice-input.json`;
the docs page prints the command for whichever host you open it on.)

### Option B — manual (no registry)

1. Packages:
   ```bash
   npm install voice-glow @phosphor-icons/react
   ```
2. shadcn primitives it builds on:
   ```bash
   npx shadcn@latest add button dropdown-menu popover
   ```
3. Copy these files from the Labs repo, keeping the paths (or fix the
   imports to match your aliases):
   - `components/ui/voice-input.tsx` — the component
   - `components/ui/voice-waveform.tsx` — live waveform + playback player
   - `hooks/use-voice-recorder.ts` — mic / MediaRecorder state machine
   - `lib/voice-recording.ts` — pure helpers (also used on the server)
4. If your `Popover` / `DropdownMenu` are the **Radix** flavour, adjust the
   few Base UI-specific bits in `voice-input.tsx`:
   - `initialFocus={cancelRef}` on `PopoverContent` → `onOpenAutoFocus={(e) => { e.preventDefault(); cancelRef.current?.focus() }}`
   - `data-popup-open:` variants → `data-[state=open]:`
   - `DropdownMenuRadioGroup`'s `onValueChange` receives a string in both; the
     `String(value)` cast can stay.
5. Put it on a field: render `<VoiceInput />` as is, or wrap your existing
   `Input` / `Textarea` (section 2).
6. Optional colour tokens (these are the defaults, taken from your theme):
   ```css
   :root {
     --voice-accent: var(--foreground);            /* recording button */
     --voice-accent-foreground: var(--background);
     --voice-wave: var(--foreground);              /* waveform, played part */
     --voice-wave-rest: color-mix(in oklab, var(--muted-foreground) 45%, transparent);
   }
   ```

Verify the install with your typecheck and lint before going further.

## 2. Use it

### The default: it renders the field

```tsx
"use client"

import { useState } from "react"
import {
  VoiceInput,
  VoiceTranscriptionError,
  type VoiceTranscribe,
} from "@/components/ui/voice-input"

const transcribe: VoiceTranscribe = async (take, { sendRecording, signal }) => {
  const form = new FormData()
  form.set("file", take.blob) // the server picks the extension from the type
  form.set("duration_ms", String(take.durationMs))
  form.set("keep_audio", sendRecording ? "1" : "0")
  const res = await fetch("/api/voice", { method: "POST", body: form, signal })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new VoiceTranscriptionError(
      body?.code === "empty" || body?.code === "unconfigured" ? body.code : "failed"
    )
  }
  return { transcript: body.transcript, audioId: body.audioId ?? null }
}

export function Answer() {
  const [answer, setAnswer] = useState("")
  const [sendRecording, setSendRecording] = useState(true) // persist this with the form
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="answer">What should it do for people?</Label>
      <VoiceInput
        multiline
        value={answer}
        onValueChange={setAnswer}
        placeholder="Type, or press the mic and say it"
        fieldProps={{ id: "answer", name: "answer" }}
        onTranscribe={transcribe}
        onDeleteRecording={(result) =>
          fetch(`/api/voice/${result.audioId}`, { method: "DELETE" }).then((r) => {
            if (!r.ok) throw new Error("delete failed") // shows "couldn't delete"
          })
        }
        sendRecording={sendRecording}
        onSendRecordingChange={setSendRecording}
      />
    </div>
  )
}
```

Without `multiline` it is a single-line input. The built-in field uses the
portal's field style (`rounded-lg`, transparent border, `bg-input/50`, `h-9`
input / `min-h-24` textarea) so it looks the same in any app.

### Or wrap your own field

```tsx
<VoiceInput value={name} onValueChange={setName} onTranscribe={transcribe}>
  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
</VoiceInput>
```

The wrapped field must be (or contain) an element with
`data-slot="input"` or `data-slot="textarea"` — shadcn's `Input` and
`Textarea` already have it. That is how the component reserves right padding
for the button (`pr-10` / `pr-11`), places it (`top-1 right-1` on an input,
`top-2 right-2` on a textarea) and adds bottom padding for the note inside
the field. With `children`, the component can't set the text itself: pass
`value` and it calls `onValueChange` with the new text when a transcript
lands, or use `onResult`.

### Props worth knowing

| Prop | Default | What it does |
| --- | --- | --- |
| `children` | built-in field | Your `Input` / `Textarea` to put the mic on. |
| `multiline` | `false` | Built-in field is a textarea. |
| `value` / `defaultValue` / `onValueChange` | — | The field's text. Typing and transcripts both go through `onValueChange`. |
| `placeholder`, `fieldProps` | — | For the built-in field (`id`, `name`, `aria-*`, `maxLength`…). |
| `insert` | `"replace"` | `"replace"` makes the transcript the field's text (portal); `"append"` adds it after what's there (reset then restores the earlier text). |
| `onTranscribe(take, { sendRecording, signal })` | — | Turn a take into text. Omit it for a mic that only records (no note in the field). Throw `VoiceTranscriptionError("empty" \| "unconfigured" \| "failed")` to choose the message. Honour `signal`. |
| `onResult(result)` | — | `{ transcript, value, durationMs, audio: Blob \| null, mimeType, audioId, sentRecording }`. `audio` is `null` when the person withheld it. |
| `onReset()` | — | The person reset the answer (after the confirm). The text is cleared for you. |
| `onDeleteRecording(result)` | — | Called whenever stored audio must stop existing: reset, a new take replacing it, or sending turned off after a send. Only called when `result.audioId` is set. Reject to show "couldn't delete". |
| `onActiveChange(active)` | — | Recording started/stopped. Use it with `disabled` to allow one recording at a time across a form, as the portal does. |
| `sendRecording` / `defaultSendRecording` / `onSendRecordingChange` | `true` | The privacy choice. Controlled or not. Usually one value for the whole form. |
| `disabled` | `false` | Disables the mic only; the field stays usable. |
| `submit` | `"auto"` | `"auto"` transcribes as soon as the take ends (portal). `"manual"` holds it under the field with playback, Discard and Send. |
| `allowPause` | `false` | Pause/Resume in the meter row. |
| `autoGainControl` | `true` | Leave it on. Off, quiet mics arrive too faint and the model returns an empty transcript. |
| `maxDurationMs` / `minDurationMs` | 5 min / 700ms | Auto-stop; discard as `too-short`. Match `maxDurationMs` to your server's upload limit. |
| `showGlow` `showMicPicker` `showTimer` `showPlayback` `showRecordingToggle` `confirmReset` | all `true` | Turn pieces off. |
| `meter` | `"meter"` | Three level bars (portal) or a short `"bars"` / `"wave"` / `"dots"` waveform. |
| `playerWaveform` | `"bars"` | Recap player style (`"bars"` / `"dots"`). |
| `radius` | the field's | Corner radius of the built-in field and the glow, px. |
| `glowVariant` / `glowColors` / `glowStrength` | `"mono"` / — / `1` | Voice Glow palette; `"mono"` (with grey band colours) is neutral. Brand it with `glowVariant="sunset"` etc. or your own colours. |
| `labels` | English (portal copy) | Every string, including `problems` and screen-reader `announce` messages. Translate here. |
| `getStream(constraints)` | getUserMedia | Swap the audio source (tests, synthetic mic, WebRTC). |

CSS tokens for the accent (stop button, meter): `--voice-accent`,
`--voice-accent-foreground`; recap waveform: `--voice-wave`,
`--voice-wave-rest`. All default to your theme's neutrals.

`useVoiceRecorder()` (in `hooks/`) is exported separately if a product truly
needs a different UI; it returns `status`, `problem`, `stream`, `analyser`,
`getLevel`, `elapsedMs`, `quiet`, `inputs`, `activeInput` and
`start/stop/pause/resume/cancel/chooseInput`. Don't reach for it to rebuild
the default.

### States

`data-state` on the root: `idle` → `requesting` → `recording` ⇄ `paused` →
`stopping` → `processing` → `recorded` (or `held` with `submit="manual"`).
Problems shown under the field: `unsupported`, `insecure`, `denied`,
`no-device`, `too-short`, `silent` (the meter saw flat zeros — muted/virtual
mic), `empty`, `unconfigured`, `failed` (take kept; "Try again" resends it),
`delete-failed`. Mic problems show the mic picker next to the message.
Escape cancels a running take or a running transcription.

## 3. Microphone permission — what has to be true

- **Secure context.** `getUserMedia` only exists on https (or
  `http://localhost`). On plain http the component shows `insecure`.
- **User gesture.** Recording starts from the button click. Don't call
  `start()` from an effect or a timer: Safari only lets an `AudioContext`
  start inside a gesture, and the component creates it there (it shares
  Voice Glow's context via `getAudioContext()`).
- **Permissions-Policy / iframes.** If you send a `Permissions-Policy`
  header, include `microphone=(self)`. Inside an iframe the frame needs
  `allow="microphone"`.
- **Denied is sticky.** After a denial the browser won't prompt again; the
  copy tells the person to allow it from the address bar. Don't loop.
- **Device choice** is remembered in localStorage (`voice-input.device`,
  configurable on the hook). A remembered device that vanished falls back to
  the default automatically; unplugging mid-take keeps what was said.

## 4. Backend transcription

See `references/server.md` for a complete Next.js route handler (POST to
transcribe, DELETE to remove stored audio) modelled on the Launch Studio
portal's voice answers. The essentials:

- Call `https://api.openai.com/v1/audio/transcriptions` with
  `model=gpt-4o-mini-transcribe` (configurable via env), multipart `file`.
  **OpenAI infers the format from the filename**, so name the file with
  `audioExtension(type)` from `lib/voice-recording.ts` (Safari records
  `audio/mp4` → `.m4a`; Chromium `audio/webm` → `.webm`) and strip codec
  params from the part's content type (`baseMime`).
- Keep the key server-side (`OPENAI_API_KEY`). A missing key is a normal
  state: answer `503 { code: "unconfigured" }`.
- Validate type (`isAcceptedAudio`) and size before forwarding; rate-limit
  the route.
- Empty text back from the model → `422 { code: "empty" }`. Upstream failure
  → `502 { code: "transcribe" }` and map it to `VoiceTranscriptionError("failed")`.
- Log shapes (bytes, model, char count), never transcript content, and never
  OpenAI's raw error message (it can echo part of the key).

## 5. Privacy — "don't send recordings", end to end

The component makes the choice visible and passes it along. **Honouring it
is the app's job, on the server.** Do all of these:

1. **Ask the server not to keep audio.** `onTranscribe` receives
   `sendRecording`. Forward it (`keep_audio=0`). The server must transcribe
   from memory and drop the bytes: no object storage, no temp file left
   behind, no audio in logs or analytics.
2. **Don't upload it anywhere else.** `onResult` gives you `audio: null` and
   `audioId: null` when withheld. Don't reach for the blob some other way.
   (Local playback in the component is from memory on the device and is
   fine.)
3. **Delete on opt-out.** If the person turns sending off after a recording
   was stored, the component calls `onDeleteRecording(result)` with its
   `audioId`. Delete the stored file *and* any reference to it (DB column,
   draft JSON). Same when the answer is reset or a new take replaces it.
4. **Persist the choice** with the rest of the form (one setting for the
   whole form is usually right), and re-apply it on the server at submit:
   if the saved choice is "don't send", strip audio references (and, if
   your product treats it as private, the verbatim transcript) from the
   submission and delete the files after the write succeeds. This catches
   anything a client failed to delete (closed tab, network error).
5. **A new take deletes the old one** that was stored for the same field
   (the component calls `onDeleteRecording` for it).

The Launch Studio portal implements the stricter variant of 4: drafts keep
audio so playback survives a reload, and on submit with recordings withheld
the server removes `audio_path` and `transcript` from every voice note and
deletes the files (`withholdRecordings` + a `send_recordings` column). Either
model is fine; the invariant is that **withheld audio never outlives the
submission**.

Write the copy honestly: the default labels say "Only the transcript is
sent. Audio stays on this device." — only keep that sentence if steps 1–3
are true in your app.

## 6. Test it

- `getStream` lets you inject a synthetic stream (see the Labs demo's
  `useSimulatedMicrophone`) or a rejected promise
  (`new DOMException("…", "NotAllowedError")`) to reach `denied`.
- Headless Chromium: launch with `--use-fake-ui-for-media-stream
  --use-fake-device-for-media-stream` and grant `microphone`.
- Check: the field is typable and text never runs under the corner button;
  denied, no mic, too-short, silent, failed + retry; the transcript lands in
  the field; reset confirm focuses Cancel; the note appears inside the field
  only after a recording and never overlaps text; opt-out after a send
  triggers your DELETE; Escape mid-take; keyboard-only flow; dark mode;
  ~375px width; Safari (mp4 recording and playback).

## 7. Credit

The glow is **Voice Glow** by **Jakub Antalik** — https://libraries.dev/voice
— used through the `voice-glow` npm package under the MIT License,
Copyright (c) 2026 Jakub Antalik. Keep the credit comment at the top of
`voice-input.tsx`. If you ever vendor `voice-glow`'s source instead of
installing it, ship its LICENSE with it. Don't use Voice Glow Pro features
(emotion detection, live transcript) — they're not part of the MIT package.
