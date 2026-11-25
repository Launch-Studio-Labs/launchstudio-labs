---
name: image-cropper
description: Add Image Cropper (crop, straighten, turn and flip a photo without ever showing an empty corner, with optional AI fill past the edges) to a React / Next.js app. Scans the repo first, picks shadcn registry or manual install, presents a short bullet plan (install path, where the cropper goes, what happens to the export, AI fill or not) and waits for the user's explicit OK before changing anything. Use when asked to add image cropping, photo editing, avatar or cover cropping, straightening, or AI outpainting to an app.
---

# Image Cropper

You are adding **Image Cropper** from Launch Studio Labs to the user's app: a
stage where the photo moves under a fixed crop frame, a straighten dial
(plus or minus 45 degrees), aspect presets, quarter turns, flip and reset.
While the photo turns, it scales and clamps itself so the frame is always
covered: no empty corners. With `generateFill`, an "AI fill" switch lets
people go past the photo's edges, and an image model on the server fills
the empty parts. Docs and live demo:
https://labs.launchstudio.space/image-cropper

You do the whole job in three phases:

1. **Scan** the repo (read-only).
2. **Plan**: send the user a short bullet plan, then **stop and wait**.
3. **Implement**, only after they say OK, then verify.

**If the user pasted the Labs prompt**, it gives you this skill's URL and the
registry item's URL. Use that registry URL for the install, and fetch the
references from the same origin as the skill. Without those URLs, use
`https://labs.launchstudio.space`.

References: read the one you need, when you need it. They sit next to this
file; if the folder is missing, fetch them from
`<origin>/skills/image-cropper/references/<name>.md`:

- `references/scan.md`: what to look for, and how to decide registry vs manual
- `references/install.md`: the registry and manual install steps
- `references/component.md`: props, export, controlled use, verification
- `references/server.md`: the AI fill route (OpenAI image edits), errors, cost

## The gate: nothing changes without the user's OK

Phases 1 and 2 are **read-only**. Before the user explicitly approves the
plan you must not install packages, run `shadcn add`, create or edit files,
add routes, touch env files, or run anything that writes to the repo.

After you send the plan, **end your turn**. Silence, a question or "looks
nice" is not approval. Approval is an explicit go-ahead ("OK", "go", "yes",
or the plan with changes they ask for).

## Phase 1: Scan (read-only)

Start from what the user told you: named files, flows and things not to
touch are fixed. Then find out (details in `references/scan.md`):

- **Stack:** React / Next.js version and router, TypeScript, Tailwind v4,
  package manager, monorepo layout.
- **shadcn:** `components.json`, aliases, whether `button` exists, Base UI
  or Radix.
- **Where cropping fits:** image uploads (avatars, covers, product photos,
  posts), existing croppers (`react-easy-crop`, `react-image-crop`,
  `cropperjs`) to replace, and what each flow does with the file after.
- **Backend for AI fill:** route style, auth, rate limiting, existing image
  model SDKs and env vars (`OPENAI_API_KEY`), hosting limits (body size,
  timeouts; an edit takes 10 to 60 seconds).

## Phase 2: Plan, then stop

Decide the install path from the scan (registry when the app has a working
`components.json`, else manual). Recommend AI fill only if the user asked
for it or the app already pays for an image model; it costs money per
fill. Send **one short message**:

```markdown
**Image Cropper: plan** (nothing changed yet)

- **Install:** shadcn registry. `components.json` found (Base UI). Adds `components/ui/image-cropper.tsx`; reuses your `button`.
- **Where:** `app/settings/avatar-form.tsx`, cropper in the upload dialog at 1:1, replacing `react-easy-crop`. Export 512px JPEG, uploaded as today.
- **AI fill:** yes. New `app/api/image-fill/route.ts` calling OpenAI image edits, behind your session auth and rate limiter. Needs `OPENAI_API_KEY` (you add it). Billed per image, see OpenAI pricing.
- **Not touching:** the admin media library (you excluded it).

Reply **OK** to go ahead, or tell me what to change.
```

Then **stop**. End the turn.

## Phase 3: Implement (only after an explicit OK)

1. **Install** by the chosen path (`references/install.md`).
2. **Wire it in** (`references/component.md`): give it `src` and a `ref`,
   set `aspect` where the flow needs a shape, and export with
   `ref.current.toBlob({ maxSize, type, quality })` where the flow used to
   take the file. Keep the flow's own upload code.
3. **AI fill**, only if approved (`references/server.md`): the server route,
   key read server-side, errors mapped to `ImageFillError` codes, then
   `generateFill` on the component.
4. **Env:** add new vars to `.env.example` with no values; tell the user
   which secrets to set where.
5. **Verify:** typecheck, lint, build, then a browser check with the
   checklist at the end of `references/component.md`.
6. **Report:** files changed, what the user still has to do, and anything
   you left out.

## Rules that always hold

- **No empty corners by default.** Never turn the cover clamp off outside
  AI fill. Don't add props that loosen it.
- **Defaults stay defaults.** The dark stage, the dial, the toolbar and the
  motion ship as they are. Change the look only if the user asks.
- **Secrets stay server-side.** No `NEXT_PUBLIC_` keys, no keys in client
  code, no image content in logs.
- **The model is pluggable.** The component only knows `generateFill`.
  Use the app's existing image provider if it has one; OpenAI is the
  default, not a requirement.
