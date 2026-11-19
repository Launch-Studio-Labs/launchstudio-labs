import type { NextConfig } from "next"

/**
 * Preview builds are a static export served as Workers assets. The ordinary
 * `next build` stays a server build, so this flag is the only switch.
 */
const staticExport = process.env.NEXT_STATIC_EXPORT === "1"

const nextConfig: NextConfig = {
  env: {
    // Always defined, so the bundler inlines it. Left unset, Next keeps it a
    // runtime lookup, the dev-dials check can't fold, and production would
    // ship the dials panel's chunk. `build:preview` sets it to "1"; `build`
    // leaves it empty. See components/dev/dials-gate.tsx.
    NEXT_PUBLIC_ENABLE_DIALS: process.env.NEXT_PUBLIC_ENABLE_DIALS ?? "",
  },
  // The dev preview reaches this server over Tailscale, not localhost.
  allowedDevOrigins: ["*.tail3d6805.ts.net"],
  ...(staticExport
    ? {
        output: "export" as const,
        // The default image optimizer needs a server. Preview assets are files.
        images: { unoptimized: true },
      }
    : {}),
}

export default nextConfig
