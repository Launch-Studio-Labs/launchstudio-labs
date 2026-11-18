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

## Interface Kit (local and PR previews only)

[Interface Kit](https://www.npmjs.com/package/interface-kit) by Josh Puckett lets you tweak the UI visually in the browser, then copy a prompt describing the change for your coding assistant.

**Open it:** click the paintbrush button in the corner of the page, then click any element to style it. When you're done, copy the prompt it gives you.

**Where it's on**

- Locally with `pnpm dev`. `.env.development` sets `NEXT_PUBLIC_INTERFACE_KIT=1`, and `next dev` is the only command that loads that file.
- On PR preview deploys. The `build:preview` script sets `NEXT_PUBLIC_INTERFACE_KIT=1` itself.

**Where it's off:** production. Plain `pnpm build` doesn't set the flag, so the kit isn't mounted and its code isn't in the bundle. Don't add the flag to `.env` or `.env.production`.

It's mounted once in `app/layout.tsx` through `components/interface-kit-gate.tsx`, so it's available on every page. There are no keys or secrets involved.
