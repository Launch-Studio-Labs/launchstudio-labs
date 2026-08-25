import { redirect } from "next/navigation"

import { demos } from "@/components/demos/registry"

/** The bare route opens on the first demo, so /playground is a valid entry. */
export default function Page() {
  redirect(`/playground/${demos[0].id}`)
}
