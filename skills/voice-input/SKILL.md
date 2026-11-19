---
name: voice-input
description: Install and wire up the Launch Studio Labs Voice Input component (shadcn) — record/stop/pause, live and playback waveforms, mic picker, permissions, transcription through your own server (OpenAI pattern), and the "don't send recordings" privacy choice end to end, including deleting stored audio. Use when adding voice input, voice notes, dictation or spoken answers to a React/Next.js app.
---

# Voice Input

A shadcn-style React component for recording a spoken answer and turning it
into text. It owns the whole client flow — microphone permission, recording,
live waveform, pause, playback, re-record with confirm, mic picker, error and
silence handling — and hands you two hooks into your backend:
`onTranscribe` (send a take, get text back) and `onDeleteRecording` (forget
stored audio).

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
   - `<PopoverTrigger render={<IconAction …/>}>` → `<PopoverTrigger asChild><IconAction …/></PopoverTrigger>`
   - `initialFocus={cancelRef}` on `PopoverContent` → `onOpenAutoFocus={(e) => { e.preventDefault(); cancelRef.current?.focus() }}`
   - `data-popup-open:` variants → `data-[state=open]:`
5. Optional colour tokens (these are the defaults, taken from your theme):
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

```tsx
"use client"

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
  const [sendRecording, setSendRecording] = useState(true) // persist this
  return (
    <VoiceInput
      onTranscribe={transcribe}
      onResult={(result) => saveAnswer(result.transcript, result.audioId)}
      onReset={() => saveAnswer("", null)}
      onDeleteRecording={(result) =>
        fetch(`/api/voice/${result.audioId}`, { method: "DELETE" }).then((r) => {
          if (!r.ok) throw new Error("delete failed") // the component shows an error
        })
      }
      sendRecording={sendRecording}
      onSendRecordingChange={setSendRecording}
    />
  )
}
```

### Props worth knowing

| Prop | Default | What it does |
| --- | --- | --- |
| `onTranscribe(take, { sendRecording, signal })` | — | Turn a take into text. Omit it for a plain voice recorder (no transcript, no privacy line). Throw `VoiceTranscriptionError("empty" \| "unconfigured" \| "failed")` to choose the message. Honour `signal` (cancel / unmount). |
| `onResult(result)` | — | `{ transcript, durationMs, audio: Blob \| null, mimeType, audioId, sentRecording }`. `audio` is `null` when the person withheld it. |
| `onReset()` | — | The person deleted the result (after the confirm). Clear what you saved. |
| `onDeleteRecording(result)` | — | Called whenever stored audio must stop existing: re-record, delete, or sending turned off after a send. Only called when `result.audioId` is set. Reject to show "couldn't delete". |
| `submit` | `"auto"` | `"auto"` sends when the take ends; `"review"` transcribes then waits for "Use transcript"; `"manual"` holds the take (playback + Send/Discard) until the person sends it. |
| `sendRecording` / `defaultSendRecording` / `onSendRecordingChange` | `true` | The privacy choice. Controlled or not. |
| `allowPause` | `false` | Pause/resume mid-take (time excludes pauses). |
| `autoGainControl` | `true` | Leave it on. Off, quiet mics arrive too faint and the model returns an empty transcript. |
| `maxDurationMs` / `minDurationMs` | 5 min / 700ms | Auto-stop; discard as `too-short`. Match `maxDurationMs` to your server's upload limit. |
| `showGlow` `showWaveform` `showPlayback` `showMicPicker` `showTimer` `showTranscript` `showRecordingToggle` `confirmReset` | all `true` | Turn pieces of chrome off. |
| `variant` | `"outline"` | `"outline" \| "soft" \| "ghost"` surface. |
| `size` / `radius` | `"md"` / by size | `"sm" \| "md" \| "lg"`, radius in px. |
| `waveform` | `"bars"` | `"bars" \| "wave" \| "dots"`, live and playback. |
| `glowVariant` / `glowColors` / `glowStrength` | `"mono"` / — / `0.8` | Voice Glow palette; `"mono"` is neutral. |
| `labels` | English | Every string, including `problems` and screen-reader `announce` messages. Translate here. |
| `getStream(constraints)` | getUserMedia | Swap the audio source (tests, synthetic mic, WebRTC). |
| `children` | — | Rendered inside the glowing surface, above the controls — e.g. a borderless `<Textarea>` the transcript is written into (set `showTranscript={false}` and fill the field in `onResult`). |

`useVoiceRecorder()` (in `hooks/`) is exported separately if the product needs
a completely custom UI; it returns `status`, `problem`, `stream`, `analyser`,
`getLevel`, `elapsedMs`, `quiet`, `inputs`, `activeInput` and
`start/stop/pause/resume/cancel/chooseInput`.

### States the person can see

`ready` (idle) → `requesting` (waiting for the permission prompt) →
`recording` ⇄ `paused` → `stopping` → `held` (manual) → `processing` →
`review` (review mode) → `done`. Problems shown under the control:
`unsupported`, `insecure`, `denied`, `no-device`, `too-short`, `silent`
(the meter saw flat zeros — muted/virtual mic), `empty`, `unconfigured`,
`failed` (take kept, "Try again" resends it), `delete-failed`.
Escape discards a running take or cancels processing.

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
   draft JSON). Same on re-record and on delete.
4. **Persist the choice** with the rest of the form (one setting for the
   whole form is usually right), and re-apply it on the server at submit:
   if the saved choice is "don't send", strip audio references (and, if
   your product treats it as private, the verbatim transcript) from the
   submission and delete the files after the write succeeds. This catches
   anything a client failed to delete (closed tab, network error).
5. **Re-recording deletes the old take** that was stored for the same field.

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
- Check: denied, no mic, too-short, silent, failed + retry, opt-out after a
  send triggers your DELETE, Escape mid-take, keyboard-only flow, dark mode,
  Safari (mp4 recording and playback).

## 7. Credit

The glow is **Voice Glow** by **Jakub Antalik** — https://libraries.dev/voice
— used through the `voice-glow` npm package under the MIT License,
Copyright (c) 2026 Jakub Antalik. Keep the credit comment at the top of
`voice-input.tsx`. If you ever vendor `voice-glow`'s source instead of
installing it, ship its LICENSE with it. Don't use Voice Glow Pro features
(emotion detection, live transcript) — they're not part of the MIT package.
