---
name: dictation-input
description: Add Dictation Input (a microphone in the corner of an existing text field, with transcription) to a React / Next.js app, frontend and backend. Scans the repo first, picks shadcn registry or manual install from what the app already has, presents a short bullet plan (install path, which fields, backend, storage, privacy) and waits for the user's explicit OK before changing anything. Use when asked to add voice input, dictation, voice notes or spoken answers to forms or text fields.
---

# Dictation Input

You are adding **Dictation Input** from Launch Studio Labs to the user's app: a
normal text field (`Input` / `Textarea`) with a small mic button in its
corner. People type as usual; pressing the mic records, the transcript is
written into the same field, and a line inside the field lets them stop
their recording being sent. Docs and live demo:
https://labs.launchstudio.space/dictation-input

You do the whole job (install, wire the fields, build the transcription
backend, storage and privacy handling) in three phases:

1. **Scan** the repo (read-only).
2. **Plan**: send the user a short bullet plan, then **stop and wait**.
3. **Implement** frontend and backend, only after they say OK, then verify.

**If the user pasted the Labs prompt**, it gives you this skill's URL and the
registry item's URL. Use that registry URL for the install, and fetch the
references from the same origin as the skill (a pull-request preview serves
both). Without those URLs, use `https://labs.launchstudio.space`.

References: read the one you need, when you need it. They sit next to this
file; if the folder is missing, fetch them from
`<origin>/skills/dictation-input/references/<name>.md`:

- `references/scan.md`: what to look for, and how to decide registry vs manual
- `references/install.md`: the registry and manual install steps
- `references/component.md`: wiring, props, states, permissions, verification
- `references/server.md`: transcription route, storage, delete, privacy end to end

## The gate: nothing changes without the user's OK

Phases 1 and 2 are **read-only**. Before the user explicitly approves the
plan you must not: install packages, run `shadcn add`, create or edit
files, add routes, write migrations, touch env files, or run anything that
writes to the repo or a database.

After you send the plan, **end your turn**. Do not continue in the same
turn, and do not treat silence, a question, or "looks interesting" as
approval. Approval is an explicit go-ahead ("OK", "go", "yes, do it", or
the plan with changes they ask for). If they change something material
(fields, storage, provider), send the revised plan and wait again.

## Phase 1: Scan (read-only)

Start from what the user already told you. If they named files, routes,
forms, an API, a provider, or things not to touch, those are fixed: scan
around them, don't re-decide them, and don't propose against them.

Then find out, without changing anything (details and commands in
`references/scan.md`):

- **Stack:** React / Next.js version and router, TypeScript, Tailwind
  version, package manager (lockfile), monorepo layout.
- **shadcn:** is there a `components.json`? Which primitives (Radix or Base
  UI), which aliases, which of `button`, `dropdown-menu`, `popover`,
  `input`, `textarea` already exist.
- **Where voice fits:** existing `Input` / `Textarea` / `<textarea>` fields
  where people write free text: long answers, descriptions, feedback,
  notes, messages. Note how each is wired (state, react-hook-form, server
  actions, validation, max length). Skip emails, numbers, passwords, search
  boxes and anything the user excluded.
- **Backend:** API routes / server actions, auth, rate limiting, existing AI
  provider SDKs and env vars, the DB and ORM with its migrations folder,
  file storage (S3, R2, Supabase Storage, Vercel Blob, UploadThing…), where
  form answers are saved, hosting (request body limits, runtime).
- **Already there:** any voice / audio / transcription code to reuse or
  replace.

## Phase 2: Plan, then stop

**Decide the install path from the scan; don't ask:**

- `components.json` for the app you're changing, with aliases that resolve
  → **shadcn registry**.
- No `components.json` (no shadcn, or components copied by hand) →
  **manual**: copy the four files and add the three primitives they import.
- Ask only when it is genuinely ambiguous (several apps with different
  `components.json`, a `components.json` whose aliases don't match the
  code). The decision table is in `references/scan.md`.

**Recommend a backend from the scan.** Reuse what the app has: route style,
auth, provider SDK, DB, storage. Default transcription: OpenAI
`gpt-4o-mini-transcribe` through a server route (`references/server.md`).
Storing audio is optional. Recommend **transcript only, no audio stored**
unless the app has private storage and a reason to keep recordings. If
audio is stored, the opt-out and delete path is part of the plan.

**Pick a `recordingPolicy`.** `"ask"` (the default) lets each person choose
with a line inside the field. If the app never stores audio, recommend
`"never"`: there is nothing to choose, so no line. Use `"always"` only when the
app needs the audio and the user says so; the line then stays as a notice.

Then send **one short message** in this shape: bullets, scannable, no
essays. Fill it with what you found; drop lines that don't apply.

```markdown
**Dictation Input: plan** (nothing changed yet)

- **Install:** shadcn registry. `components.json` found (Base UI, aliases `@/components/ui`). Adds 4 files + `voice-glow`; reuses your `button`, adds `dropdown-menu` and `popover`.
- **Where** (mic in the corner of the existing field, nothing else moves):
  - `app/(app)/feedback/feedback-form.tsx` → "Details" textarea
  - `app/(app)/onboarding/goals-step.tsx` → "What are you building?" textarea
  - Skipping: email, budget (not free text)
- **Transcription:** new `app/api/voice/route.ts`, OpenAI `gpt-4o-mini-transcribe`, behind your session auth and rate limiter. Needs `OPENAI_API_KEY` (not set yet; you add it).
- **Recordings:** not stored; transcribe and discard (recommended). Alternative: store in your private Supabase bucket `uploads` + `audio_path` column on `feedback` (migration `0012_feedback_voice.sql`), deleted on reset / opt-out.
- **Privacy:** `recordingPolicy="ask"`: the in-field "Don't send recordings" line, saved with the form; the server never stores withheld audio and deletes stored audio on opt-out. (`"never"` if no audio is stored; `"always"` only if you need it.)
- **Other:** needs HTTPS; Safari records MP4 (handled); 5-min cap fits your 4.5 MB body limit; your shadcn is Radix → 2 small edits in `dictation-input.tsx`; transcription is billed per minute (see OpenAI pricing).
- **Not touching:** the settings page (you excluded it).

Reply **OK** to go ahead, or tell me what to change.
```

The plan must:

- say registry or manual **and why** (one clause);
- name every file you'll create or edit, and each field by its label;
- say what happens to audio: stored or not, and the delete path if stored;
- list new env vars, services and costs (point to the pricing page; don't
  quote prices from memory).

Then **stop**. End the turn.

## Phase 3: Implement (only after an explicit OK)

Do exactly the approved plan. If something contradicts it (a file moved, a
migration conflicts, a dependency won't install), stop and ask instead of
improvising.

1. **Install** by the chosen path (`references/install.md`). Registry:
   `npx shadcn@latest add <registry URL from the prompt, or https://labs.launchstudio.space/r/dictation-input.json>`
   with the app's package manager. Manual: packages, primitives, the four
   files, imports fixed to the app's aliases. Radix-flavoured shadcn needs
   the small edits listed there.
2. **Wire the fields.** Wrap each approved field; don't replace it:
   `<DictationInput value={v} onValueChange={setV} onTranscribe={…}><Textarea … /></DictationInput>`,
   keeping its props, validation, form binding and max length
   (`references/component.md`). One `sendRecording` value for the whole
   form; one recording at a time across fields (`onActiveChange` +
   `disabled`).
3. **Backend** (`references/server.md`): the transcription route behind the
   app's auth and rate limiting; key read server-side; errors mapped to
   `VoiceTranscriptionError` codes.
4. **Storage and privacy**, only what was approved:
   - transcript only: the route never writes audio anywhere;
   - audio stored: save it only when `keep_audio=1`, add the DELETE route,
     wire `onDeleteRecording`, persist `sendRecording` with the form, and
     strip / delete withheld audio again at submit. Add a migration with the
     app's migration tool if a column is needed.
5. **Env:** add new vars to `.env.example` (never real values) and the env
   schema if there is one; tell the user which secrets to set where.
6. **Verify:** the app's typecheck, lint, tests and build; then a browser
   check (headless Chromium with `--use-fake-ui-for-media-stream
   --use-fake-device-for-media-stream` is fine); checklist at the end of
   `references/component.md`.
7. **Report:** files changed, what the user still has to do (set secrets,
   run the migration, deploy), and anything you left out.

## Rules that always hold

- **Field first.** Voice is an extra on a field the form already has. Never
  build a standalone recorder, pill or panel that replaces the field, and
  don't change the field's layout beyond the mic in its corner.
- **Defaults stay defaults.** Neutral colours, mic in the corner, Voice Glow
  along the field, "Listening" and the clock under it. Change the look only
  if the user asks (`references/component.md`).
- **Withheld audio never outlives the request.** `sendRecording: false`
  means the server transcribes and discards: no storage, no logs, no
  analytics. Stored audio is deleted on reset, on a new take, and on
  opt-out.
- **Secrets stay server-side.** No `NEXT_PUBLIC_` keys, no keys in client
  code, no transcript content in logs.
- **Credit stays.** The glow is Voice Glow by Jakub Antalik
  (https://libraries.dev/voice, MIT, Copyright (c) 2026 Jakub Antalik). Keep
  the credit comment at the top of `dictation-input.tsx`; don't use Voice Glow
  Pro features.
