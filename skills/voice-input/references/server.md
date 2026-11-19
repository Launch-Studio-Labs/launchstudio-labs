# Voice Input — server reference (Next.js App Router)

A transcription endpoint and a delete endpoint for `<VoiceInput>` (the mic
in the corner of a text field), modelled on the Launch Studio portal (`lib/voice-answer-server.ts` +
`app/api/intro-questionnaire/voice/route.ts`). The client calls DELETE
when the person resets an answer, when a new take replaces a stored one, and
when they turn sending recordings off after a send. Adapt storage, auth and rate
limiting to the app; keep the privacy behaviour as is.

Environment:

```bash
OPENAI_API_KEY=sk-...                         # server only, never NEXT_PUBLIC_
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe # optional
```

On Cloudflare Workers (OpenNext), read the key from the Worker env binding
(`getCloudflareContext().env`) first and fall back to `process.env` for
`next dev`. Read it by a variable name, not `process.env.OPENAI_API_KEY`
literally — Next inlines static `process.env.X` at build time and would
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
    // Log the status and OpenAI's error *code* only — the message can echo
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

## `app/api/voice/route.ts` — transcribe

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

## `app/api/voice/[id]/route.ts` — delete

```ts
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // 1. Auth: the caller must own this recording. Check the path prefix /
  //    owner column before touching storage — never delete by a raw id
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
