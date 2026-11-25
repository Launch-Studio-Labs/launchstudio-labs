import { redirect } from "next/navigation"

/** The site has no page of its own at the root; it opens on the first one. */
export default function Page() {
  redirect("/dictation-input")
}
