# Voice Input — install (Phase 3, step 1)

Only after the user approved the plan. Use the app's package manager
(`pnpm dlx` / `bunx` / `yarn dlx` / `npx`).

Requirements: React 18+, Tailwind v4, shadcn-style `components/ui` with the
`cn` helper. It uses `Button`, `DropdownMenu` and `Popover` from the app's
own `components/ui`.

## Registry path (the app has `components.json`)

```bash
npx shadcn@latest add https://labs.launchstudio.space/r/voice-input.json
```

Run it in the folder that holds the target app's `components.json`. It
writes four files, installs `voice-glow` and `@phosphor-icons/react`, and
adds `button`, `dropdown-menu` and `popover` if they are missing — in the
app's own shadcn style.

A Labs pull-request preview serves the same item at
`<preview-origin>/r/voice-input.json` (e.g.
`https://cursor-voice-input-launchstudio-labs.launch-studio.workers.dev/r/voice-input.json`).
Use production unless the user asked for a preview build.

If `shadcn add` prompts to overwrite an existing file, don't overwrite the
app's own `button` / `dropdown-menu` / `popover` — answer no and keep theirs.

## Manual path (no `components.json`)

1. Packages:
   ```bash
   npm install voice-glow @phosphor-icons/react
   ```
2. Primitives — `button`, `dropdown-menu`, `popover`. If the app has some
   shadcn files already, add the missing ones the same way they were added
   (copied from ui.shadcn.com, or `npx shadcn@latest add` if the user agreed
   to `shadcn init` in the plan).
3. Copy the four files (raw URLs; keep the paths or map them to the app's
   folders):
   - `components/ui/voice-input.tsx` — the component
   - `components/ui/voice-waveform.tsx` — live waveform + recap player
   - `hooks/use-voice-recorder.ts` — mic / MediaRecorder state machine
   - `lib/voice-recording.ts` — pure helpers (the server uses them too)

   From `https://raw.githubusercontent.com/Launch-Studio-Labs/launchstudio-labs/main/<path>`,
   or take the `content` of each file in
   `https://labs.launchstudio.space/r/voice-input.json`.
4. Fix imports to the app's aliases: `@/components/ui/*`, `@/hooks/*`,
   `@/lib/utils` (`cn`), `@/lib/voice-recording`.

## Radix-flavoured shadcn

The component is written against Base UI primitives. With Radix `Popover` /
`DropdownMenu`, edit `voice-input.tsx`:

- `initialFocus={cancelRef}` on `PopoverContent` →
  `onOpenAutoFocus={(e) => { e.preventDefault(); cancelRef.current?.focus() }}`
- `data-popup-open:` variants → `data-[state=open]:`
- `DropdownMenuRadioGroup` `onValueChange` gets a string in both; the
  `String(value)` cast can stay.

## Colour tokens (optional)

Defaults come from the theme; set these only if the user wants a brand
colour:

```css
:root {
  --voice-accent: var(--foreground);            /* stop button, level meter */
  --voice-accent-foreground: var(--background);
  --voice-wave: var(--foreground);              /* waveforms, played part */
  --voice-wave-rest: color-mix(in oklab, var(--muted-foreground) 45%, transparent);
}
```

## Check the install

Typecheck and lint before wiring anything. A missing `cn`, alias or
primitive shows up here.
