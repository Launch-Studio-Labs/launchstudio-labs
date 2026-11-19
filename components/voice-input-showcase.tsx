"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"

import { PageHeader } from "@/components/page-header"
import { VoiceInputDemo } from "@/components/demos/voice-input-demo"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const PRODUCTION_ORIGIN = "https://labs.launchstudio.space"
const REPO = "https://github.com/Launch-Studio-Labs/launchstudio-labs/blob/main"

const FILES = [
  "components/ui/voice-input.tsx",
  "components/ui/voice-waveform.tsx",
  "hooks/use-voice-recorder.ts",
  "lib/voice-recording.ts",
]

const USAGE = `import { VoiceInput, VoiceTranscriptionError } from "@/components/ui/voice-input"

<VoiceInput
  onTranscribe={async (take, { sendRecording, signal }) => {
    const form = new FormData()
    form.set("file", take.blob)
    form.set("keep_audio", sendRecording ? "1" : "0")
    const res = await fetch("/api/voice", { method: "POST", body: form, signal })
    if (!res.ok) throw new VoiceTranscriptionError("failed")
    return res.json() // { transcript, audioId }
  }}
  onResult={(result) => setAnswer(result.transcript)}
  onDeleteRecording={(result) =>
    fetch(\`/api/voice/\${result.audioId}\`, { method: "DELETE" })
  }
/>`

const TOKENS = `/* Optional — these are the defaults, from your shadcn theme. */
:root {
  --voice-accent: var(--foreground);            /* recording button */
  --voice-accent-foreground: var(--background);
  --voice-wave: var(--foreground);              /* waveform, played part */
  --voice-wave-rest: color-mix(in oklab, var(--muted-foreground) 45%, transparent);
}`

/**
 * The registry URL for the host the page is served from, so a pull-request
 * preview prints its own install command. The server render, and localhost,
 * print production's.
 */
function useRegistryOrigin() {
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

export function VoiceInputShowcase() {
  const origin = useRegistryOrigin()
  const registryCommand = `npx shadcn@latest add ${origin}/r/voice-input.json`

  return (
    <>
      <PageHeader href="/voice-input" />

      <Prose className="labs-enter labs-enter-delay-2">
        <p>
          A record button that handles the{" "}
          <strong>whole trip from microphone to transcript</strong>: asking for
          permission, a live waveform while you talk, pause, playback after,
          re-record with a confirm, and a clear choice about whether the audio
          leaves the device at all.
        </p>
        <p>
          Every state is reachable below without a microphone or an API key —
          switch the microphone to <em>Simulated</em> or <em>Blocked</em>, or
          make transcription fail, and watch what the app receives.
        </p>
      </Prose>

      <VoiceInputDemo className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <Section title="Install" className="labs-enter labs-enter-delay-3">
        <Tabs defaultValue="registry" className="gap-6">
          <TabsList>
            <TabsTrigger value="registry">shadcn registry</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="registry" className="flex flex-col gap-3">
            <Command text={registryCommand} />
            <Prose>
              <p>
                Adds the four files below, installs <Code>voice-glow</Code> and
                the Phosphor icons, and pulls in shadcn&apos;s{" "}
                <Code>button</Code>, <Code>dropdown-menu</Code> and{" "}
                <Code>popover</Code> if you don&apos;t have them.
              </p>
            </Prose>
          </TabsContent>
          <TabsContent value="manual" className="flex flex-col gap-6">
            <Step n={1} title="Install the packages">
              <Command text="npm install voice-glow @phosphor-icons/react" />
            </Step>
            <Step n={2} title="Add the shadcn primitives it builds on">
              <Command text="npx shadcn@latest add button dropdown-menu popover" />
            </Step>
            <Step n={3} title="Copy the files">
              <ul className="flex flex-col gap-1.5 font-mono text-xs">
                {FILES.map((file) => (
                  <li key={file}>
                    <a
                      href={`${REPO}/${file}`}
                      className="text-foreground underline decoration-foreground/20 underline-offset-2 hover:decoration-foreground/60"
                    >
                      {file}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-body">
                They import from <Code>@/components/ui</Code>,{" "}
                <Code>@/hooks</Code> and <Code>@/lib</Code>. Change the paths if
                your aliases differ.
              </p>
            </Step>
            <Step n={4} title="Tune the colours, if you like">
              <CodeBlock>{TOKENS}</CodeBlock>
            </Step>
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Usage" className="labs-enter labs-enter-delay-3">
        <CodeBlock>{USAGE}</CodeBlock>
        <Prose>
          <p>
            Without <Code>onTranscribe</Code> it is a plain voice recorder.{" "}
            <Code>submit</Code> picks what happens when a take ends:{" "}
            <Code>&quot;auto&quot;</Code> sends it,{" "}
            <Code>&quot;review&quot;</Code> transcribes and waits for the person
            to accept, and <Code>&quot;manual&quot;</Code> holds the take until
            they press Send. Every part — glow, waveform, playback, mic picker,
            timer, pause, the confirm — has its own prop, and all copy goes
            through <Code>labels</Code>.
          </p>
        </Prose>
      </Section>

      <Section
        title="Recordings and privacy"
        className="labs-enter labs-enter-delay-3"
      >
        <Prose>
          <p>
            People can turn sending their recording off. When they do,{" "}
            <strong>
              the audio still goes to transcription but must not be kept
            </strong>
            : <Code>onTranscribe</Code> gets <Code>sendRecording: false</Code>,
            your server transcribes and throws the bytes away, and{" "}
            <Code>onResult</Code> hands you the transcript with{" "}
            <Code>audio: null</Code>.
          </p>
          <p>
            Turning it off after a recording was sent calls{" "}
            <Code>onDeleteRecording</Code> with the stored <Code>audioId</Code>{" "}
            — so does re-recording or deleting. The component can only ask;
            deleting the file is your server&apos;s job.
          </p>
        </Prose>
      </Section>

      <Section title="Credit" className="labs-enter labs-enter-delay-3">
        <Prose>
          <p>
            The glow is{" "}
            <a
              href="https://libraries.dev/voice"
              className="font-medium text-foreground underline decoration-foreground/20 underline-offset-2 hover:decoration-foreground/60"
            >
              Voice Glow
            </a>{" "}
            by <strong>Jakub Antalik</strong>, used through the{" "}
            <Code>voice-glow</Code> package under the MIT License. Copyright ©
            2026 Jakub Antalik.
          </p>
        </Prose>
      </Section>
    </>
  )
}

function Section({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("flex flex-col gap-6", className)}>
      <h2 className="text-base font-medium">{title}</h2>
      {children}
    </section>
  )
}

function Step({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">
        <span className="mr-2 text-muted-foreground tabular-nums">{n}</span>
        {title}
      </p>
      {children}
    </div>
  )
}

function Prose({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[1lh] text-sm leading-normal text-body [&_strong]:font-medium [&_strong]:text-foreground",
        className
      )}
    >
      {children}
    </div>
  )
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[4px] bg-muted px-1 py-px font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted p-5 font-mono text-xs leading-normal">
      <code>{children}</code>
    </pre>
  )
}

function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted py-1.5 pr-1.5 pl-4">
      <code className="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto py-1.5 font-mono text-xs whitespace-nowrap text-muted-foreground">
        {text}
      </code>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={copied ? "Copied" : "Copy command"}
        onClick={copy}
        className="relative"
      >
        <CopyIcon
          className={cn(
            "absolute transition-[opacity,scale,filter] duration-200 ease-out",
            copied ? "scale-50 opacity-0 blur-[2px]" : "opacity-100"
          )}
        />
        <CheckIcon
          className={cn(
            "absolute transition-[opacity,scale,filter] duration-200 ease-out",
            copied ? "opacity-100" : "scale-50 opacity-0 blur-[2px]"
          )}
        />
      </Button>
    </div>
  )
}
