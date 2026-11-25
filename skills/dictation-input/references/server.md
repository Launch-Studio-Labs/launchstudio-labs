# Dictation Input: backend (Phase 3, steps 3 to 5)

Only what the user approved in the plan. Adapt the code to the app's own
route style, auth, rate limiting, env handling, DB and storage. The
examples below are a Next.js App Router baseline.

Two shapes, pick the approved one:

- **Transcript only (recommended default):** one POST route. Audio is
  transcribed from memory and dropped. No storage, no DELETE route, no
  migration. `keep_audio` is ignored (always discard), and `audioId` is
  always `null`.
- **Audio stored:** the POST route also stores audio when `keep_audio=1`,
  plus a DELETE route, a reference saved with the answer, and submit-time
  enforcement (below).

The code is modelled on the Launch Studio portal's voice answers
(`lib/voice-answer-server.ts` + `app/api/intro-questionnaire/voice/route.ts`).
The client calls DELETE when the person resets an answer, when a new take
replaces a stored one, and when they turn sending recordings off after a
send.

Environment:

```bash
OPENAI_API_KEY=sk-...                         # server only, never NEXT_PUBLIC_
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe # optional
```

On Cloudflare Workers (OpenNext), read the key from the Worker env binding
(`getCloudflareContext().env`) first and fall back to `process.env` for
`next dev`. Read it by a variable name, not `process.env.OPENAI_API_KEY`
literally: Next inlines static `process.env.X` at build time and would
freeze an empty value.

## `lib/voice-server.ts`

```ts
import "server-only"

import { audioExtension, baseMime, isAcceptedAudio } from "@/lib/voice-recording"

const TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions"
/** Match the client's maxDurationMs; ~5 min of Opus is well under this. */
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024

export class VoiceFailure extends Error {
  constructor(
    readonly code: "unconfigured" | "empty" | "transcribe" | "invalid",
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

export function readVoiceConfig() {
  const env = process.env as Record<string, string | undefined>
  return {
    key: (env["OPENAI_API_KEY"] ?? "").trim(),
    model: (env["OPENAI_TRANSCRIBE_MODEL"] ?? "").trim() || "gpt-4o-mini-transcribe",
  }
}

export async function readAudio(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size < 1) {
    throw new VoiceFailure("invalid", 400, "Record something first.")
  }
  if (!isAcceptedAudio(file.type)) {
    throw new VoiceFailure("invalid", 400, "That recording format isn't supported.")
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new VoiceFailure("transcribe", 413, "That recording is too long.")
  }
  return { bytes: await file.arrayBuffer(), type: baseMime(file.type) || "audio/webm" }
}

export async function transcribe(
  config: ReturnType<typeof readVoiceConfig>,
  audio: { bytes: ArrayBuffer; type: string }
) {
  // OpenAI infers the format from the filename: the extension must match the
  // container the browser produced. The part type drops codec parameters.
  const form = new FormData()
  form.set("file", new Blob([audio.bytes], { type: audio.type }), `voice.${audioExtension(audio.type)}`)
  form.set("model", config.model)
  form.set("response_format", "json")

  let response: Response
  try {
    response = await fetch(TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}` },
      body: form,
      signal: AbortSignal.timeout(90_000),
    })
  } catch {
    throw new VoiceFailure("transcribe", 502, "Couldn't transcribe that recording.")
  }
  if (!response.ok) {
    // Log the status and OpenAI's error *code* only; the message can echo
    // part of the key. Never log the transcript or the audio.
    console.error(JSON.stringify({ msg: "voice_transcribe_failed", status: response.status }))
    throw new VoiceFailure("transcribe", 502, "Couldn't transcribe that recording.")
  }
  const body = (await response.json()) as { text?: unknown }
  const text = typeof body.text === "string" ? body.text.trim() : ""
  console.log(JSON.stringify({ msg: "voice_transcribed", bytes: audio.bytes.byteLength, chars: text.length }))
  if (!text) throw new VoiceFailure("empty", 422, "We couldn't hear any words.")
  return text
}
```

## `app/api/voice/route.ts`: transcribe

```ts
import { NextRequest, NextResponse } from "next/server"

import { audioExtension } from "@/lib/voice-recording"
import { VoiceFailure, readAudio, readVoiceConfig, transcribe } from "@/lib/voice-server"

export async function POST(request: NextRequest) {
  // 1. Auth + rate limit here (the portal allows 8 requests/minute per client).

  const config = readVoiceConfig()
  if (!config.key) {
    return NextResponse.json({ code: "unconfigured" }, { status: 503 })
  }

  const form = await request.formData()
  const keepAudio = form.get("keep_audio") === "1"

  try {
    const audio = await readAudio(form.get("file"))
    const transcript = await transcribe(config, audio)

    // 2. Store the audio ONLY when the person agreed to send it. When
    //    keep_audio is 0 the bytes go out of scope here and are never written.
    const audioId = keepAudio
      ? await storeAudio(audio.bytes, audio.type, `voice.${audioExtension(audio.type)}`)
      : null

    return NextResponse.json({ transcript, audioId })
  } catch (error) {
    if (error instanceof VoiceFailure) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status })
    }
    return NextResponse.json({ code: "transcribe" }, { status: 502 })
  }
}

/** Private bucket (R2 / S3 / Supabase storage). Return your own id. */
async function storeAudio(bytes: ArrayBuffer, type: string, name: string): Promise<string> {
  // e.g. `${userId}/${fieldId}/voice/${nanoid()}.${ext}`, upsert: false
  throw new Error("implement storeAudio")
}
```

Client mapping (already in the SKILL usage example): `empty` →
`VoiceTranscriptionError("empty")`, `unconfigured` →
`VoiceTranscriptionError("unconfigured")`, anything else → `"failed"`.

## `app/api/voice/[id]/route.ts`: delete

```ts
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // 1. Auth: the caller must own this recording. Check the path prefix /
  //    owner column before touching storage; never delete by a raw id
  //    from the client without that check.
  // 2. Remove the object AND every reference to it (draft answers, DB rows).
  // 3. Idempotent: deleting something already gone is a success.
  await deleteAudio(id)
  return new NextResponse(null, { status: 204 })
}

async function deleteAudio(id: string) {
  throw new Error("implement deleteAudio")
}
```

## Submit-time enforcement

Persist the person's `sendRecording` choice with the form. When the form is
submitted with recordings withheld, on the server:

1. Strip audio references (and the verbatim transcript, if your product
   treats it as private) from every voice answer in the submission and in
   the previously saved draft.
2. Write the submission.
3. Delete the collected audio files.

That is what the portal's `withholdRecordings()` does on
`POST /api/intro-questionnaire/responses`. It guarantees withheld audio
never outlives the submission even if a client-side delete never arrived.

## Fitting it into the app's data

- **Where the reference lives.** Next to the answer it belongs to: an
  `audio_path` (or `audio_id`) column on the table that stores the field, or
  inside the answer JSON if answers are stored as JSON. Store the storage
  key, never a public URL.
- **The choice.** Persist `send_recordings` (boolean, default true) once per
  form/response: a column, or a field in the saved JSON.
- **Migrations.** Use the app's tool (Prisma migrate, drizzle-kit, Supabase
  SQL migrations, raw SQL files) and naming. Additive and nullable, so
  existing rows keep working. Don't run it against a shared database;
  tell the user to.
- **Storage.** A private bucket/prefix, scoped per owner
  (`<ownerId>/<formId>/voice/<random>.<ext>`). Serve playback through signed
  URLs or an authenticated route, never a public bucket.
- **Auth on DELETE.** Check the caller owns the key (prefix or owner
  column) before deleting. Idempotent: already gone is success.
- **Other providers.** If the app already uses another speech-to-text
  provider (Deepgram, AssemblyAI, Google, Azure, the Vercel AI SDK's
  `experimental_transcribe`), use it. The contract to the client is the
  same: `{ transcript, audioId }`, `422 { code: "empty" }`,
  `503 { code: "unconfigured" }`, anything else a failure.
- **Limits.** Keep `maxDurationMs` on the client under the host's body
  limit. Chrome records Opus in WebM at roughly 0.7 MB/min (5 min ≈ 3.5 MB);
  Vercel Functions cap request bodies at 4.5 MB. Edge/Workers runtimes: use `arrayBuffer()` and `Blob`,
  not Node `Buffer`.

## Privacy: "don't send recordings", end to end

The component shows the choice and passes it along. Honouring it is the
server's job. All of these, whenever audio can be stored:

1. **`keep_audio=0` means transcribe and drop.** No object storage, no temp
   file left behind, no audio in logs, analytics or error reports.
2. **Nothing else uploads it.** `onResult` gives `audio: null` and
   `audioId: null` when withheld. (Local playback in the component plays
   from memory on the device, which is fine.)
3. **Delete on opt-out, reset and replacement.** The component calls
   `onDeleteRecording(result)` with the stored `audioId`; delete the object
   *and* its reference (column, draft JSON).
4. **Re-apply the choice at submit** (above): strip references and delete
   files for withheld answers, so a delete that never arrived (closed tab,
   network error) can't leave audio behind.
5. **Honest copy.** The in-field line says "Recordings won't be sent with
   your answers." Only ship that if 1 to 4 are true.
