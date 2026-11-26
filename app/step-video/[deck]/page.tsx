import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { deckIds } from "@/components/step-video/deck-ids"
import { DeckPlayer } from "@/components/step-video/registry"

/** Unlisted, like the playground: a workbench for recording, not a page. */
export const metadata: Metadata = {
  title: "Step video · Launch Studio Labs",
  robots: { index: false, follow: false },
}

export function generateStaticParams() {
  return deckIds.map((deck) => ({ deck }))
}

export default async function Page({
  params,
}: {
  params: Promise<{ deck: string }>
}) {
  const { deck } = await params
  if (!(deckIds as readonly string[]).includes(deck)) notFound()
  return <DeckPlayer id={deck} />
}
