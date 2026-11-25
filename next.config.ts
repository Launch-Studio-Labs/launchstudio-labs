import type { NextConfig } from "next"

/**
 * Preview builds are a static export served as Workers assets. The ordinary
 * `next build` stays a server build, so this flag is the only switch.
 */
const staticExport = process.env.NEXT_STATIC_EXPORT === "1"

const nextConfig: NextConfig = {
  // The dev preview reaches this server over Tailscale, not localhost.
  allowedDevOrigins: ["*.tail3d6805.ts.net"],
  ...(staticExport
    ? {
        output: "export" as const,
        // The default image optimizer needs a server. Preview assets are files.
        images: { unoptimized: true },
      }
    : {
        // The same as public/_redirects, which serves the static preview.
        async redirects() {
          return [
            ["/voice-input", "/dictation-input"],
            ["/playground/voice-input", "/playground/dictation-input"],
            ["/r/voice-input.json", "/r/dictation-input.json"],
            ["/skills/voice-input/:path*", "/skills/dictation-input/:path*"],
          ].map(([source, destination]) => ({
            source,
            destination,
            permanent: true,
          })).concat({
            // The Empty state page was removed.
            source: "/playground/empty-state",
            destination: "/playground/dictation-input",
            permanent: false,
          })
        },
      }),
}

export default nextConfig
