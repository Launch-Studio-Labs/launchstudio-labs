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

A record → transcribe → review control with a mic picker, live and playback
waveforms, pause, re-record with confirm, and a send / withhold-recording
choice. Docs and playground: https://labs.launchstudio.space/voice-input
(`/playground/voice-input` for the bare demo).

Install through the registry:

```bash
npx shadcn@latest add https://labs.launchstudio.space/r/voice-input.json
# a pull-request preview serves the same item at <preview-origin>/r/voice-input.json
```

Or by hand: `npm install voice-glow @phosphor-icons/react`,
`npx shadcn@latest add button dropdown-menu popover`, then copy
`components/ui/voice-input.tsx`, `components/ui/voice-waveform.tsx`,
`hooks/use-voice-recorder.ts` and `lib/voice-recording.ts`.

`skills/voice-input/SKILL.md` is the agent guide: install paths, wiring,
microphone permissions, an OpenAI transcription route, and how to honour
"don't send recordings" end to end (including deleting stored audio).

The glow is [Voice Glow](https://libraries.dev/voice) by Jakub Antalik, MIT
License, Copyright (c) 2026 Jakub Antalik — see `THIRD_PARTY_NOTICES.md`.
