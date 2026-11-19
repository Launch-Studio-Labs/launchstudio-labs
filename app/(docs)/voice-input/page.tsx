import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { VoiceInputShowcase } from "@/components/voice-input-showcase"

export const metadata: Metadata = {
  title: docsTitle("/voice-input"),
  description:
    "A normal text field with a microphone in its corner. Copy one prompt into your agent: it scans your app, asks for your OK, then installs it and builds the transcription backend.",
}

export default function Page() {
  return <VoiceInputShowcase />
}
