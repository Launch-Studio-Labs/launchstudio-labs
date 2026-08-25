import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The dev preview reaches this server over Tailscale, not localhost.
  allowedDevOrigins: ["*.tail3d6805.ts.net"],
}

export default nextConfig
