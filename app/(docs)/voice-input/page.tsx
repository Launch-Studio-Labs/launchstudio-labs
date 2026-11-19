import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { VoiceInputShowcase } from "@/components/voice-input-showcase"

export const metadata: Metadata = {
  title: docsTitle("/voice-input"),
  description:
    "A normal text field with a microphone in its corner: record, transcribe into the same field, play back, reset, and choose whether the recording is sent.",
}

export default function Page() {
  return <VoiceInputShowcase />
}
