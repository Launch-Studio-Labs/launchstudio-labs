# Voice Input — the component (Phase 3, step 2)

A normal text field with a mic in its corner. Idle: the field and a small
mic button top-right, its corners concentric with the field's. Recording:
stop button, Voice Glow along the field, "Listening" + clock + mic picker
under it. Processing: spinner, "Writing your answer…". Done:
the transcript is in the field, the corner button resets (with a confirm), a
recap player sits under the field, and a line inside the field says whether
recordings are sent, with a link to turn that off.

## Wire it to an existing field (the usual case)

Wrap the field the form already has. Keep its props, validation and form
binding; the component only adds the mic around it.

```tsx
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

<VoiceInput
  value={details}
  onValueChange={setDetails}
  onTranscribe={transcribe}
  sendRecording={sendRecording}
  onSendRecordingChange={setSendRecording}
>
  <Textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} />
</VoiceInput>
```

The wrapped field must be (or contain) an element with `data-slot="input"`
or `data-slot="textarea"` — shadcn's `Input` and `Textarea` have it. That is
how the mic reserves right padding (`pr-10` / `pr-11`), sits `top-1 right-1`
on an input or `top-2 right-2` on a textarea, and makes room for the line
inside the field. A raw `<textarea>` works if you add `data-slot="textarea"`.

**react-hook-form:** use a `Controller` (or `watch` + `setValue`) so the
component can write the transcript:

```tsx
<Controller
  name="details"
  control={control}
  render={({ field }) => (
    <VoiceInput value={field.value ?? ""} onValueChange={field.onChange} onTranscribe={transcribe}>
      <Textarea {...field} />
    </VoiceInput>
  )}
/>
```

**Several fields in one form:** one `sendRecording` state for the form,
saved with it; and one recording at a time:

```tsx
const [active, setActive] = useState<string | null>(null)
// per field "details":
disabled={active !== null && active !== "details"}
onActiveChange={(on) => setActive((a) => (on ? "details" : a === "details" ? null : a))}
```

With no field to wrap, `<VoiceInput multiline value={v} onValueChange={setV} />`
renders one (shadcn field style: `rounded-lg`, `bg-input/50`, `h-9` /
`min-h-24`).

## Props

| Prop | Default | What it does |
| --- | --- | --- |
| `children` | built-in field | The `Input` / `Textarea` to put the mic on. |
| `multiline` | `false` | Built-in field is a textarea. |
| `value` / `defaultValue` / `onValueChange` | — | The field's text. Transcripts go through `onValueChange`. |
| `placeholder`, `fieldProps` | — | For the built-in field (`id`, `name`, `aria-*`, `maxLength`…). |
| `insert` | `"replace"` | `"replace"`: the transcript becomes the text. `"append"`: added after it (reset restores the earlier text). |
| `onTranscribe(take, { sendRecording, signal })` | — | Turn a take into text. Omit for a mic that only records. Throw `VoiceTranscriptionError("empty" \| "unconfigured" \| "failed")`. Honour `signal`. |
| `onResult(result)` | — | `{ transcript, value, durationMs, audio: Blob \| null, mimeType, audioId, sentRecording }`. `audio` is `null` when withheld. |
| `onReset()` | — | The person reset the answer (after the confirm); the text is cleared for you. |
| `onDeleteRecording(result)` | — | Stored audio must go: reset, a new take replacing it, or sending turned off after a send. Only called with an `audioId`. Reject to show "couldn't delete". |
| `onActiveChange(active)` | — | Recording started/stopped. |
| `sendRecording` / `defaultSendRecording` / `onSendRecordingChange` | `true` | The privacy choice. |
| `disabled` | `false` | Disables the mic only. |
| `submit` | `"auto"` | `"manual"` holds a take under the field with playback, Discard and Send. |
| `allowPause` | `false` | Pause / Resume in the line under the field. |
| `autoGainControl` | `true` | Leave on: quiet mics otherwise come back as empty transcripts. |
| `maxDurationMs` / `minDurationMs` | 5 min / 700ms | Match `maxDurationMs` to the server's body limit. |
| `showMicPicker` `showTimer` `showPlayback` `showRecordingToggle` `confirmReset` | `true` | Turn pieces off. |
| `fieldEffect` | `"glow"` | Voice drawn inside the field: `"glow"` (Voice Glow), `"level"` (bars across the full width), `"bars"`, `"wave"`, `"dots"`, `"none"`. Each has its own motion while the take is transcribed; on a single-line field the non-glow effects fade out behind the text. |
| `playerWaveform` | `"bars"` | Recap player: `"bars"` / `"dots"`. |
| `radius` | the field's | Built-in field and glow radius, px. |
| `buttonRadius` | `"auto"` | Mic corners. `"auto"` = `max(0, fieldRadius − inset)`, measured (concentric); `"full"` = circle; a number = px. |
| `glowVariant` / `glowColors` / `glowStrength` | `"mono"` / — / `1` | The palette for every field effect — the glow and the level / bars / wave / dots canvas, recording and processing alike. `"mono"` is neutral (theme ink). `glowStrength` is the glow only. |
| `labels` | English | Every string, including `problems` and screen-reader `announce`. Translate here if the app is localised. |
| `getStream(constraints)` | getUserMedia | Swap the audio source (tests, WebRTC). |

Leave the look props at their defaults unless the user asked otherwise.

## States

`data-state` on the root: `idle` → `requesting` → `recording` ⇄ `paused` →
`stopping` → `processing` → `recorded` (or `held` with `submit="manual"`).
Problems under the field: `unsupported`, `insecure`, `denied`, `no-device`,
`too-short`, `silent` (flat zeros — muted/virtual mic), `empty`,
`unconfigured`, `failed` (take kept; "Try again" resends), `delete-failed`.
Escape cancels a take or a running transcription.

## Microphone permission — what must be true

- **HTTPS** (or `http://localhost`); otherwise `insecure`.
- **User gesture:** recording starts from the button click (Safari only
  starts an `AudioContext` inside one). Never call `start()` from an effect.
- **Permissions-Policy:** include `microphone=(self)` if the app sends that
  header; iframes need `allow="microphone"`.
- **Denied is sticky:** the browser won't prompt again; the copy says how to
  allow it. Don't loop.
- The chosen device is remembered in localStorage (`voice-input.device`).

## Verify

- Headless Chromium: `--use-fake-ui-for-media-stream
  --use-fake-device-for-media-stream`, grant `microphone`. Or pass
  `getStream={() => Promise.reject(new DOMException("", "NotAllowedError"))}`
  to reach `denied`.
- Check each wired field: typable, text never under the mic; a take writes
  into the field and the form's state (submit it); reset confirm focuses
  Cancel and clears the text; the privacy line appears inside the field only
  after a recording and never overlaps text; turning it off triggers the
  delete path (if audio is stored); Escape mid-take; denied / too-short /
  failed + retry; dark mode; ~375px; Safari (MP4) if available.
