# Image Cropper: install (Phase 3, step 1)

Only after the user approved the plan. Use the app's package manager.

Requirements: React 18+, Tailwind v4, shadcn-style `components/ui` with the
`cn` helper. It uses `Button` from the app's own `components/ui`.

## Registry path (the app has `components.json`)

```bash
npx shadcn@latest add https://labs.launchstudio.space/r/image-cropper.json
```

It writes `components/ui/image-cropper.tsx`, installs
`@phosphor-icons/react`, and adds `button` if it is missing. If `shadcn add`
asks to overwrite the app's own `button`, answer no.

## Manual path (no `components.json`)

1. `npm install @phosphor-icons/react`
2. Add shadcn's `button` the way the app added its other components.
3. Copy `components/ui/image-cropper.tsx` from
   `https://raw.githubusercontent.com/Launch-Studio-Labs/launchstudio-labs/main/components/ui/image-cropper.tsx`,
   or take the `content` of the file in
   `https://labs.launchstudio.space/r/image-cropper.json`.
4. Fix imports to the app's aliases: `@/components/ui/button`,
   `@/lib/utils` (`cn`).

## Check the install

Typecheck and lint before wiring anything.
