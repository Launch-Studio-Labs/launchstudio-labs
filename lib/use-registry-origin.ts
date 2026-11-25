"use client"

import { useSyncExternalStore } from "react"

export const PRODUCTION_ORIGIN = "https://labs.launchstudio.space"

/**
 * The origin to print in install commands and prompts: the host the page is
 * served from, so a pull-request preview prints its own registry URLs. The
 * server render, localhost and Tailscale dev hosts print production's.
 */
export function useRegistryOrigin() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      const { origin, hostname } = window.location
      return hostname === "localhost" || hostname.endsWith(".ts.net")
        ? PRODUCTION_ORIGIN
        : origin
    },
    () => PRODUCTION_ORIGIN
  )
}
