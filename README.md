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

## Voice Input

A normal text input or textarea with a microphone in its corner — the
layout of the Launch Studio portal's voice answers. People type as usual;
pressing the mic records (Voice Glow along the field, level meter, timer and
mic picker underneath), and the transcript is written into the same field.
Afterwards the corner button resets the answer with a confirm, a recap player
sits under the field, and a line inside the field lets people stop their
recordings being sent. Docs and playground:
https://labs.launchstudio.space/voice-input (`/playground/voice-input` for
the bare demo).

```tsx
<VoiceInput multiline value={answer} onValueChange={setAnswer} onTranscribe={transcribe} />
// or put the mic on your own field
<VoiceInput value={name} onValueChange={setName} onTranscribe={transcribe}>
  <Input value={name} onChange={(e) => setName(e.target.value)} />
</VoiceInput>
```

**Add it with the skill (default).** `skills/voice-input/SKILL.md` makes a
coding agent scan your repo, send you a short plan (registry or manual
install, which fields, transcription, recordings and privacy, env vars) and
wait for your OK — then install the component and implement the frontend and
backend. Nothing changes until you approve.

```bash
npx skills add https://github.com/Launch-Studio-Labs/launchstudio-labs/tree/main/skills/voice-input
# or download https://labs.launchstudio.space/skills/voice-input/SKILL.md into your agent's skills folder
```

**Or install it yourself** through the registry:

```bash
npx shadcn@latest add https://labs.launchstudio.space/r/voice-input.json
# a pull-request preview serves the same item at <preview-origin>/r/voice-input.json
```

Or by hand: `npm install voice-glow @phosphor-icons/react`,
`npx shadcn@latest add button dropdown-menu popover`, then copy
`components/ui/voice-input.tsx`, `components/ui/voice-waveform.tsx`,
`hooks/use-voice-recorder.ts` and `lib/voice-recording.ts`.

Optional looks: `fieldEffect` and `meter` take the same styles (`glow`,
`level`, `bars`, `wave`, `dots`) for the voice inside the field and under it;
`buttonRadius` is `"auto"` (concentric with the field), `"full"` or px.

The skill's `references/` hold the details for doing it by hand too:
`install.md`, `component.md` (wiring, props, permissions), `server.md`
(OpenAI transcription route, storage, deleting audio, "don't send
recordings" end to end) and `scan.md`.

The glow is [Voice Glow](https://libraries.dev/voice) by Jakub Antalik, MIT
License, Copyright (c) 2026 Jakub Antalik — see `THIRD_PARTY_NOTICES.md`.
