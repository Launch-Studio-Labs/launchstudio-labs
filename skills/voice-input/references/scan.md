# Voice Input — scanning the repo (Phase 1)

Everything here is read-only. Use search and file reads; don't install,
build, or run migrations to find things out.

## 0. The user's instructions first

Re-read what the user asked for. Named files, forms, routes, providers,
"use our X", "don't touch Y" are constraints, not suggestions. Scan to
confirm they exist and to find what they need — don't propose alternatives
unless one is impossible (then say why in the plan).

## 1. Stack

| Look at | For |
| --- | --- |
| `package.json` (each app's, in a monorepo) | `next` / `react` versions, `typescript`, `tailwindcss` (v4 needed), form libs (`react-hook-form`, `formik`, `@tanstack/react-form`), AI SDKs (`openai`, `ai`, `@ai-sdk/*`), DB/ORM (`prisma`, `drizzle-orm`, `@supabase/supabase-js`, `kysely`, `mongoose`), storage (`@aws-sdk/client-s3`, `@vercel/blob`, `uploadthing`) |
| lockfile | package manager: `pnpm-lock.yaml` → pnpm, `bun.lock(b)` → bun, `yarn.lock` → yarn, else npm |
| `app/` vs `pages/` | App Router (route handlers, server actions) or Pages Router (`pages/api`) |
| `pnpm-workspace.yaml`, `turbo.json`, `apps/*` | monorepo: work inside the app the user means |
| `vercel.json`, `wrangler.*`, `netlify.toml`, Dockerfile | hosting → request body limits and runtime (Node vs edge/Workers) |

## 2. shadcn — registry or manual

```bash
# find every components.json outside node_modules
find . -name components.json -not -path "*/node_modules/*"
```

Read it: `style`, `tailwind.css`, `aliases` (`components`, `ui`, `lib`,
`hooks`, `utils`). Then check the code agrees: the `ui` alias folder exists
and holds shadcn components; `lib/utils` exports `cn`.

Primitive flavour (matters for a few class/prop names):

- `@base-ui/react` in deps, or `components/ui/popover.tsx` importing from
  `@base-ui/react/popover` → **Base UI** (the component's native flavour).
- `@radix-ui/*` or `radix-ui` in deps, `asChild` in `components/ui/*` →
  **Radix** → apply the edits in `install.md`.

Decision:

| Finding | Install path |
| --- | --- |
| One `components.json` for the target app, aliases resolve | **Registry** |
| No `components.json`, but a `components/ui` folder of shadcn-like files | **Manual** (copy files; adjust imports) |
| No shadcn at all | **Manual**, plus add the three primitives (`button`, `dropdown-menu`, `popover`) — via `npx shadcn init` only if the user agrees in the plan; otherwise copy them |
| Several `components.json` (monorepo) | Registry, run in the target app's folder — say which in the plan |
| `components.json` whose aliases point at folders that don't exist | Ambiguous — say so in the plan and ask |
| Tailwind v3 | Install path as above, but flag it: the component is written for Tailwind v4 (`group-has-*`, `pointer-coarse:`, `field-sizing-content`, CSS-variable arbitrary values) and needs small class edits on v3 |

State the choice and the one-line reason in the plan. Don't ask the user to
pick unless the table says ambiguous.

## 3. Where voice fits

```bash
# shadcn fields and raw ones
grep -rnE "<(Textarea|Input)\b|<textarea\b" --include=*.tsx --include=*.jsx app src components | grep -v node_modules
```

Good candidates: free text people would rather say than type — long
answers, descriptions, feedback, notes, briefs, messages, comments. Usually
textareas; single-line only when the answer is a sentence (a name, a title,
a short goal).

Skip: email, phone, URL, number, password, date, search, OTP, anything with
strict format validation, and anything the user excluded.

For each candidate note: file, field label, how its value is held
(`useState`, `react-hook-form` `register`/`Controller`, `name` in a server
action form), validation and `maxLength`, and how the form is submitted and
saved (route, action, table). That is what you'll wrap and what the
transcript must flow into.

## 4. Backend, data, storage

- **Routes:** `app/api/**/route.ts`, `pages/api/**`, `"use server"` files,
  or a separate server (Express, Hono, tRPC). Match the existing style.
- **Auth:** how other routes check the session (`auth()`, `getServerSession`,
  middleware, Supabase `getUser`). The transcription route must use it.
- **Rate limiting:** existing helper (Upstash, a custom limiter)? Reuse it.
- **Provider:** existing `OPENAI_API_KEY` or AI SDK setup? Reuse it.
  Otherwise plan a new env var. Check `.env.example` / env schema
  (`env.ts`, `t3-env`, `zod`) for how vars are declared.
- **DB:** ORM, schema file, migrations folder and naming. Where the form
  answers live (table/columns or JSON). Whether a column for an audio
  reference (and the send-recordings choice) would be needed.
- **Storage:** an existing private bucket and its client helper. Is it
  private (signed URLs) or public? Recordings must be private.
- **Limits:** host body size (e.g. Vercel Functions 4.5 MB), route
  `maxDuration`, edge vs Node runtime (multipart and `Buffer` behave
  differently on edge/Workers).

## 5. Existing audio code

`grep -rniE "mediarecorder|getUserMedia|transcri|whisper|audio/webm"` —
reuse or replace it; say which in the plan.

## What the plan needs from the scan

- install path + reason
- each field: file + label (+ what you'll skip and why)
- the files you'll create (route, server helper, migration) and edit
- provider + env vars; auth and rate limiting you'll reuse
- recordings: not stored (default) or where they'd be stored, with the
  delete/opt-out path
- other material details: HTTPS, Safari, body limits, Radix edits,
  Tailwind version, costs (point to the pricing page)
