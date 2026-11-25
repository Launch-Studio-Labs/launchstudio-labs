import type { NextConfig } from "next"

/**
 * Preview builds are a static export served as Workers assets. The ordinary
 * `next build` stays a server build, so this flag is the only switch.
 */
const staticExport = process.env.NEXT_STATIC_EXPORT === "1"

const nextConfig: NextConfig = {
  // `route.server.ts` files are server-only routes (the Image Cropper's AI
  // fill). The server build picks them up; the static export, which has no
  // server to run them, leaves them out.
  pageExtensions: staticExport
    ? ["tsx", "ts", "jsx", "js"]
    : ["tsx", "ts", "jsx", "js", "server.ts"],
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
          }))
        },
      }),
}

export default nextConfig
