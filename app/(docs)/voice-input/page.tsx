import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { VoiceInputShowcase } from "@/components/voice-input-showcase"

export const metadata: Metadata = {
  title: docsTitle("/voice-input"),
  description:
    "Record, review and send a spoken answer: permissions, live waveform, playback, re-record and a clear choice about sending the audio.",
}

export default function Page() {
  return <VoiceInputShowcase />
}
