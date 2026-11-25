# Image Cropper: scanning the repo (Phase 1)

Everything here is read-only. Search and read files; don't install or
build to find things out.

## 1. Stack

| Look at | For |
| --- | --- |
| `package.json` | `react` 18+ / `next` versions, `tailwindcss` (v4), image libs (`react-easy-crop`, `react-image-crop`, `cropperjs`, `sharp`), AI SDKs (`openai`, `ai`, `@ai-sdk/*`, `replicate`, `@fal-ai/*`) |
| lockfile | package manager: pnpm, bun, yarn or npm |
| `app/` vs `pages/` | route handlers or `pages/api` |
| `vercel.json`, `wrangler.*`, `netlify.toml` | body size and timeout limits for the AI fill route |

## 2. shadcn: registry or manual

```bash
find . -name components.json -not -path "*/node_modules/*"
```

| Found | Install |
| --- | --- |
| `components.json` with aliases that resolve, `lib/utils` exports `cn` | shadcn registry |
| no `components.json`, or shadcn files copied by hand | manual |
| several apps with different `components.json` | ask which app |

The component uses only `Button` from shadcn, so Base UI vs Radix makes no
difference.

## 3. Where cropping fits

Search for `type="file"`, `accept="image/`, `FileReader`, `createObjectURL`,
`useDropzone`, existing cropper imports, and upload calls (`fetch` with
`FormData`, presigned URLs, `uploadthing`, Supabase Storage). For each flow,
note: the shape it needs (avatar 1:1, cover 16:9, free), the size it
uploads, and where the file goes after.

## 4. AI fill backend

Look for `OPENAI_API_KEY` (or another image provider's key) in `.env.example`
and env schemas, existing image generation routes, auth helpers and rate
limiters. Note the host's request timeout: an image edit can take up to a
minute.
