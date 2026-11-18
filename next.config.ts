import type { NextConfig } from "next"

/**
 * Preview builds are a static export served as Workers assets. The ordinary
 * `next build` stays a server build, so this flag is the only switch.
 */
const staticExport = process.env.NEXT_STATIC_EXPORT === "1"

/**
 * Routes that moved. The page was first published as "Bolder on press"; it
 * is about font weight that does not shift layout, so it lives under that
 * name now. A static export cannot serve these, so `public/_redirects`
 * carries the same list for the Workers preview. Keep the two in step.
 */
const movedRoutes = [
  ["/bolder-on-press", "/weight-without-shift"],
  ["/playground/bolder-on-press", "/playground/weight-without-shift"],
  [
    "/playground/bolder-on-press-compare",
    "/playground/weight-without-shift-compare",
  ],
] as const

const nextConfig: NextConfig = {
  // The dev preview reaches this server over Tailscale, not localhost.
  allowedDevOrigins: ["*.tail3d6805.ts.net", "127.0.0.1"],
  ...(staticExport
    ? {
        output: "export" as const,
        // The default image optimizer needs a server. Preview assets are files.
        images: { unoptimized: true },
      }
    : {
        async redirects() {
          return movedRoutes.map(([source, destination]) => ({
            source,
            destination,
            permanent: true,
          }))
        },
      }),
}

export default nextConfig
