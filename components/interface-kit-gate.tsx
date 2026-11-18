"use client"

import dynamic from "next/dynamic"

/**
 * Josh Puckett's Interface Kit: click the paintbrush, click an element, tweak
 * it in the browser, copy the prompt.
 *
 * On when `NEXT_PUBLIC_INTERFACE_KIT=1`, which `.env.development` sets for
 * `pnpm dev` and the `build:preview` script sets for PR previews. Plain
 * `pnpm build` never sets it, so production does not mount it.
 *
 * Next inlines the flag at build time. When it is off, the condition below is
 * a constant `false`, so the dynamic import is dropped and the editor never
 * reaches the production bundle.
 *
 * Preview builds are production builds, and the kit switches itself off when
 * NODE_ENV is "production" unless told otherwise, hence `enabled`. It is
 * client-only (`ssr: false`): it reads the DOM, and keeping it out of the
 * server render means nothing it adds can mismatch on hydration.
 */
const InterfaceKit =
  process.env.NEXT_PUBLIC_INTERFACE_KIT === "1"
    ? dynamic(
        () => import("interface-kit/react").then((mod) => mod.InterfaceKit),
        { ssr: false }
      )
    : null

export function InterfaceKitGate() {
  return InterfaceKit ? <InterfaceKit enabled /> : null
}
