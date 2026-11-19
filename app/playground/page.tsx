import { redirect } from "next/navigation"

import { demos } from "@/components/demos/registry"

/**
 * The bare route opens on the first demo, so /playground is a valid entry.
 * A static export cannot emit the server redirect, so that build renders a
 * refresh instead. Cloudflare also follows `public/_redirects`, which must
 * stay pointed at the same first demo.
 */
export default function Page() {
  const href = `/playground/${demos[0].id}`

  if (process.env.NEXT_STATIC_EXPORT === "1") {
    return (
      <main className="flex min-h-svh items-center justify-center p-8">
        <meta httpEquiv="refresh" content={`0; url=${href}`} />
        <a href={href} className="text-sm text-foreground">
          Open the playground
        </a>
      </main>
    )
  }

  redirect(href)
}
