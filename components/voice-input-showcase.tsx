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

const transcribe = async (take, { sendRecording, signal }) => {
  const form = new FormData()
  form.set("file", take.blob)
  form.set("keep_audio", sendRecording ? "1" : "0")
  const res = await fetch("/api/voice", { method: "POST", body: form, signal })
  if (!res.ok) throw new VoiceTranscriptionError("failed")
  return res.json() // { transcript, audioId }
}

// The default: a text field with the mic in its corner.
<VoiceInput
  multiline
  value={answer}
  onValueChange={setAnswer}
  placeholder="Type, or press the mic and say it"
  onTranscribe={transcribe}
  onDeleteRecording={(result) =>
    fetch(\`/api/voice/\${result.audioId}\`, { method: "DELETE" })
  }
/>

// Or put the mic on your own shadcn field.
<VoiceInput value={name} onValueChange={setName} onTranscribe={transcribe}>
  <Input value={name} onChange={(e) => setName(e.target.value)} />
</VoiceInput>`

const SKILL_COMMAND =
  "npx skills add https://github.com/Launch-Studio-Labs/launchstudio-labs/tree/main/skills/voice-input"
/** Served from this site by app/skills/[...path], on every host. */
const SKILL_FILE = "/skills/voice-input/SKILL.md"
const SKILL_INSTALL = "/skills/voice-input/references/install.md"

/**
 * What the Copy prompt button puts on the clipboard. Short on purpose: the
 * skill carries the workflow and the details, so the prompt only says what to
 * add, where the skill and the component live, and that nothing happens
 * without an OK. The origin is the host the page is served from, so a preview
 * copies URLs that exist on that preview.
 */
function buildPrompt(origin: string) {
  return `Add the Voice Input component from Launch Studio Labs to my app.

Skill (follow it): ${origin}/skills/voice-input/SKILL.md
Component (shadcn registry item): ${origin}/r/voice-input.json

Scan my repo first, then send me a short bullet plan and wait for my OK before you change anything. Once I approve, implement it end to end: frontend and backend.`
}

const SKILL_STEPS = [
  {
    title: "Scans your repo",
    body: "Reads your shadcn setup, the forms and fields where voice fits, your API, database and storage — and any instructions you gave it. Changes nothing.",
  },
  {
    title: "Asks for your OK",
    body: "Sends a short plan: registry or manual install and why, which fields get the mic, how transcription and recordings fit your backend, new env vars. Then waits.",
  },
  {
    title: "Implements it",
    body: "Installs the component, puts the mic on the agreed fields, builds the transcription route and the don't-send-recordings handling, and checks it works.",
  },
]

const LINK =
  "font-medium text-foreground underline decoration-foreground/20 underline-offset-2 hover:decoration-foreground/60"

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
  const prompt = buildPrompt(origin)

  return (
    <>
      <PageHeader href="/voice-input" />

      <Prose className="labs-enter labs-enter-delay-2">
        <p>
          <strong>A normal text field with a microphone in its corner.</strong>{" "}
          People type as usual; the mic is the extra. Press it, talk, stop — the
          transcript is written into the same field. A player under the field
          plays it back, and a line inside the field lets people decide whether
          their recording is sent at all.
        </p>
        <p>
          Try it below. Transcription is a stand-in here, so it works without an
          API key; the log shows what your app would receive.
        </p>
      </Prose>

      <VoiceInputDemo className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <Section
        title="Add it with a prompt"
        className="labs-enter labs-enter-delay-3"
      >
        <Prose>
          <p>
            Copy this into your coding agent. It points the agent at the Voice
            Input skill and the component, and the agent does the rest.
          </p>
        </Prose>
        <PromptCard prompt={prompt} />
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium">What happens after you paste it</p>
          <ol className="flex flex-col gap-4">
            {SKILL_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-1 pt-0.5">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-sm leading-normal text-body">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="rounded-lg bg-muted px-4 py-3 text-sm font-medium">
          Nothing changes in your repo until you say OK.
        </p>
      </Section>

      <Section
        title="Install it yourself"
        className="labs-enter labs-enter-delay-3"
      >
        <Prose>
          <p>
            Optional — the prompt does all of this for you. If you&apos;d rather
            wire it by hand, use the shadcn registry when your app has a{" "}
            <Code>components.json</Code>, and copy the files when it
            doesn&apos;t.
          </p>
        </Prose>
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
            <Step n={4} title="Put it on a field">
              <p className="text-sm text-body">
                Use it as it comes — it renders the field — or wrap the{" "}
                <Code>Input</Code> / <Code>Textarea</Code> you already have. If
                your <Code>Popover</Code> and <Code>DropdownMenu</Code> are the
                Radix flavour, see{" "}
                <a href={SKILL_INSTALL} className={LINK}>
                  the install notes
                </a>{" "}
                for the small changes.
              </p>
            </Step>
            <Step n={5} title="Tune the colours, if you like">
              <CodeBlock>{TOKENS}</CodeBlock>
            </Step>
          </TabsContent>
        </Tabs>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Or keep the skill in your agent</p>
          <Command text={SKILL_COMMAND} />
          <Prose>
            <p>
              Installs it into your project&apos;s agent skills, or{" "}
              <a href={SKILL_FILE} download="SKILL.md" className={LINK}>
                download SKILL.md
              </a>
              . Then ask your agent to add voice input.
            </p>
          </Prose>
        </div>
      </Section>

      <Section title="Usage" className="labs-enter labs-enter-delay-3">
        <CodeBlock>{USAGE}</CodeBlock>
        <Prose>
          <p>
            Leave out <Code>children</Code> and it renders the field itself —
            single line by default, a textarea with <Code>multiline</Code>. Pass
            your own <Code>Input</Code> or <Code>Textarea</Code> and the mic
            sits on that instead. The transcript replaces the text, or with{" "}
            <Code>insert=&quot;append&quot;</Code> follows it.
          </p>
          <p>
            <Code>fieldEffect</Code> picks how the voice is drawn inside the
            field: <Code>glow</Code> (Voice Glow, the default),{" "}
            <Code>level</Code>, <Code>bars</Code>, <Code>wave</Code> or{" "}
            <Code>dots</Code>. Each keeps moving in its own way while the take
            is transcribed, and on a single-line field it fades out behind the
            text. The mic&apos;s
            corners are concentric with the field&apos;s:{" "}
            <Code>buttonRadius=&quot;auto&quot;</Code> takes the field&apos;s
            radius minus the button&apos;s inset, or pass a number or{" "}
            <Code>&quot;full&quot;</Code>.
          </p>
          <p>
            Everything else is opt-in: <Code>submit=&quot;manual&quot;</Code>{" "}
            holds a take under the field until the person presses Send,{" "}
            <Code>allowPause</Code> adds pause, and the mic picker, timer,
            player, recording line and reset confirm each have their own switch.
            All copy goes through <Code>labels</Code>.
          </p>
        </Prose>
      </Section>

      <Section
        title="Recordings and privacy"
        className="labs-enter labs-enter-delay-3"
      >
        <Prose>
          <p>
            Once a field has a recording, a line inside it lets people turn
            sending recordings off. When they do,{" "}
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
            — so does resetting the answer or a new take replacing it. The
            component can only ask; deleting the file is your server&apos;s job.
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

/**
 * The prompt, readable before it is copied, and one obvious button. Only the
 * icon reacts to a copy — the label stays, so the button never changes size.
 */
function PromptCard({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    void navigator.clipboard.writeText(prompt)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
      <pre className="px-2 pt-1 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">
        {prompt}
      </pre>
      <Button size="lg" onClick={copy} className="self-start">
        <span className="relative size-4">
          <CopyIcon
            className={cn(
              "absolute inset-0 transition-[opacity,scale,filter] duration-200 ease-out",
              copied ? "scale-50 opacity-0 blur-[2px]" : "opacity-100"
            )}
          />
          <CheckIcon
            className={cn(
              "absolute inset-0 transition-[opacity,scale,filter] duration-200 ease-out",
              copied ? "opacity-100" : "scale-50 opacity-0 blur-[2px]"
            )}
          />
        </span>
        Copy prompt
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Prompt copied" : ""}
      </span>
    </div>
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
