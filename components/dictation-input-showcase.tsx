"use client"

import { CodeBlock, Command } from "@/components/code-block"
import {
  DictationInputDemo,
  DictationInputWalkthrough,
} from "@/components/demos/dictation-input-demo"
import {
  ApiTable,
  propTable,
  type ApiRow,
} from "@/components/docs/api-reference"
import { CopyPromptButton, PromptCard } from "@/components/docs/prompt-card"
import { Code, Section } from "@/components/docs/section"
import { Steps } from "@/components/docs/steps"
import { PageHeader } from "@/components/page-header"
import { Prose } from "@/components/prose"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DictationInputOwnProps } from "@/components/ui/dictation-input"
import { useRegistryOrigin } from "@/lib/use-registry-origin"

const REPO = "https://github.com/Launch-Studio-Labs/launchstudio-labs/blob/main"

const FILES = [
  "components/ui/dictation-input.tsx",
  "components/ui/voice-waveform.tsx",
  "hooks/use-voice-recorder.ts",
  "lib/voice-recording.ts",
]

const USAGE = `import { DictationInput, VoiceTranscriptionError } from "@/components/ui/dictation-input"

const transcribe = async (take, { sendRecording, signal }) => {
  const form = new FormData()
  form.set("file", take.blob)
  form.set("keep_audio", sendRecording ? "1" : "0")
  const res = await fetch("/api/voice", { method: "POST", body: form, signal })
  if (!res.ok) throw new VoiceTranscriptionError("failed")
  return res.json() // { transcript, audioId }
}

// Wrap the field your form already has.
<DictationInput
  value={answer}
  onValueChange={setAnswer}
  onTranscribe={transcribe}
  onDeleteRecording={(result) =>
    fetch(\`/api/voice/\${result.audioId}\`, { method: "DELETE" })
  }
>
  <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} />
</DictationInput>

// A single-line field works the same way.
<DictationInput value={name} onValueChange={setName} onTranscribe={transcribe}>
  <Input value={name} onChange={(e) => setName(e.target.value)} />
</DictationInput>`

/** Served from this site by app/skills/[...path], on every host. */
const SKILL_INSTALL = "/skills/dictation-input/references/install.md"

/**
 * What the Copy prompt button puts on the clipboard. Short on purpose: the
 * skill carries the workflow — scan, plan, wait for the OK, implement — so the
 * prompt only says what to add and where the skill and the component live.
 * The origin is the host the page is served from, so a preview copies URLs
 * that exist on that preview.
 */
function buildPrompt(origin: string) {
  return `Add the Dictation Input component from Launch Studio Labs to my app.

Skill (follow it): ${origin}/skills/dictation-input/SKILL.md

Component (shadcn registry item): ${origin}/r/dictation-input.json`
}

/** How the component behaves, in the order a person meets it. */
const HOW_IT_WORKS = [
  {
    title: "Type as usual",
    body: "The input acts as a standard text field, with voice input on top.",
  },
  {
    title: "Press and talk",
    body: "Click the button and start dictating. A live waveform shows that the microphone is recording. If needed, you can change the input from a dropdown. Press stop to finish.",
  },
  {
    title: "Summarized as text",
    body: "Your server transcribes the recording, and the summary is written into the field, ready to edit. A player under it plays the recording back.",
  },
  {
    title: "Choose what's sent",
    body: "Pick whether to send the recording along with the text. This option can be forced or disabled through the component's props.",
  },
]

const SKILL_STEPS = [
  {
    title: "Scans your repo",
    body: "Reads your shadcn setup, the forms and fields where voice fits, your API, database and storage, and any instructions you gave it. Changes nothing.",
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

const TOKENS = `/* Optional: these are the defaults, from your shadcn theme. */
:root {
  --voice-accent: var(--foreground);            /* recording button */
  --voice-accent-foreground: var(--background);
  --voice-wave: var(--foreground);              /* waveform, played part */
  --voice-wave-rest: color-mix(in oklab, var(--muted-foreground) 45%, transparent);
}`

export function DictationInputShowcase({ skill }: { skill: string }) {
  const origin = useRegistryOrigin()
  const registryCommand = `npx shadcn@latest add ${origin}/r/dictation-input.json`
  const prompt = buildPrompt(origin)

  return (
    <>
      {/* The intro is one block: what it is, the whole flow playing, and the
          steps that name what just happened. */}
      <div className="labs-enter labs-enter-delay-1 flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <PageHeader
            href="/dictation-input"
            animated={false}
            action={
              <CopyPromptButton prompt={prompt} variant="secondary">
                Add with a prompt
              </CopyPromptButton>
            }
          />
          <p className="text-sm leading-normal text-pretty text-body">
            A standard text field which allows for voice dictation. The summary
            is written into the same field. User can decide if they want to send
            the full recording along with the text.
          </p>
        </header>
        <DictationInputWalkthrough />
        <Steps steps={HOW_IT_WORKS} />
      </div>

      <Section title="States" className="labs-enter labs-enter-delay-3">
        <DictationInputDemo />
      </Section>

      <Separator className="labs-enter labs-enter-delay-3" />

      <Section title="Installation" className="labs-enter labs-enter-delay-3">
        {/* The prompt first: the agent does the whole job. The other two
            tabs are for wiring it by hand. */}
        <Tabs defaultValue="prompt" className="gap-6">
          <TabsList>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="registry">shadcn registry</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="prompt" className="flex flex-col gap-8">
            <Prose>
              <p>
                Copy this into your coding agent. It points the agent at the
                Dictation Input skill and the component, and the agent does the
                rest.
              </p>
            </Prose>
            <Steps steps={SKILL_STEPS} />
            <PromptCard prompt={prompt} skill={skill} />
          </TabsContent>
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
          <TabsContent value="manual">
            <Steps
              className="gap-6"
              steps={[
                {
                  title: "Install the packages",
                  body: (
                    <Command text="npm install voice-glow @phosphor-icons/react" />
                  ),
                },
                {
                  title: "Add the shadcn primitives it builds on",
                  body: (
                    <Command text="npx shadcn@latest add button dropdown-menu popover" />
                  ),
                },
                {
                  title: "Copy the files",
                  body: (
                    <>
                      <ul className="flex flex-col gap-1.5 font-mono text-xs">
                        {FILES.map((file) => (
                          <li key={file}>
                            <a href={`${REPO}/${file}`} className={LINK}>
                              {file}
                            </a>
                          </li>
                        ))}
                      </ul>
                      <p>
                        They import from <Code>@/components/ui</Code>,{" "}
                        <Code>@/hooks</Code> and <Code>@/lib</Code>. Change the
                        paths if your aliases differ.
                      </p>
                    </>
                  ),
                },
                {
                  title: "Put it on a field",
                  body: (
                    <p>
                      Wrap the <Code>Input</Code> or <Code>Textarea</Code> you
                      already have. If your <Code>Popover</Code> and{" "}
                      <Code>DropdownMenu</Code> are the Radix flavour, see{" "}
                      <a href={SKILL_INSTALL} className={LINK}>
                        the install notes
                      </a>{" "}
                      for the small changes.
                    </p>
                  ),
                },
                {
                  title: "Tune the colours, if you like",
                  body: <CodeBlock code={TOKENS} language="css" />,
                },
              ]}
            />
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Usage" className="labs-enter labs-enter-delay-3">
        <CodeBlock code={USAGE} />
      </Section>

      <Section title="API Reference" className="labs-enter labs-enter-delay-3">
        {API.map((part) => (
          <ApiTable key={part.name} {...part} />
        ))}
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
 * Props that exist but stay off this page on purpose: `preview` is for docs
 * and screenshots, `getStream` for tests. The skill documents both.
 */
type UndocumentedProp = "preview" | "getStream"

/**
 * DictationInput's own props — not the div props it passes through — minus the
 * ones left out above. The table below must list exactly these.
 */
type DocumentedProp = Exclude<keyof DictationInputOwnProps, UndocumentedProp>

const VOICE_INPUT_ROWS = propTable<DocumentedProp>()([
  {
    prop: "children",
    type: "ReactNode",
    description:
      "Required. Your shadcn Input or Textarea. The mic goes in its corner.",
  },
  {
    prop: "value",
    type: "string",
    description: "The field's text, the same value you give the field.",
  },
  {
    prop: "onValueChange",
    type: "(value: string) => void",
    description:
      "A transcript was written in, or the answer reset: the field's new text.",
  },
  {
    prop: "insert",
    type: '"replace" | "append"',
    default: '"replace"',
    description:
      "Whether the transcript replaces the text or follows it. Reset restores the earlier text.",
  },
  {
    prop: "disabled",
    type: "boolean",
    default: "false",
    description: "Disables the mic. The field stays usable.",
  },
  {
    prop: "onTranscribe",
    type: "VoiceTranscribe",
    description:
      "Turns a take into text: (take, { sendRecording, signal }) => { transcript, audioId }. Leave it out for a mic that only records.",
  },
  {
    prop: "onResult",
    type: "(result: VoiceResult) => void",
    description:
      "A transcript landed. audio is null when the recording was withheld.",
  },
  {
    prop: "maxDurationMs",
    type: "number",
    default: "300000",
    description: "The longest take. Match it to your server's body limit.",
  },
  {
    prop: "recordingPolicy",
    type: '"ask" | "always" | "never"',
    default: '"ask"',
    description:
      'Whether recordings go along with the transcript. "ask": a line inside the field lets the person choose. "always": always sent, and the line says so. "never": transcribed, then thrown away, with no line and no player.',
  },
  {
    prop: "sendRecording",
    type: "boolean",
    description:
      'Controlled: the person\'s choice, with recordingPolicy="ask". Starts on sending when left out. When false, the server transcribes and throws the recording away.',
  },
  {
    prop: "onSendRecordingChange",
    type: "(send: boolean) => void",
    description: "The person changed the choice in the line inside the field.",
  },
  {
    prop: "onDeleteRecording",
    type: "(result: VoiceResult) => void | Promise<void>",
    description:
      'Stored audio must go: on reset, a new take, or sending turned off. Called only with an audioId. Reject to show "couldn\'t delete".',
  },
  {
    prop: "onActiveChange",
    type: "(active: boolean) => void",
    description:
      "Recording started or stopped, to block the mic on other fields.",
  },
  {
    prop: "onReset",
    type: "() => void",
    description:
      "The person reset the answer, after the confirm. The text is cleared for you.",
  },
  {
    prop: "fieldEffect",
    type: '"glow" | "level" | "dots" | "none"',
    default: '"glow"',
    description:
      "How the voice is drawn inside the field, and its motion while the take is transcribed.",
  },
  {
    prop: "glowVariant",
    type: "VoiceBeamColorVariant",
    default: '"mono"',
    description:
      'The palette for the glow and every field effect. "mono" is neutral.',
  },
  {
    prop: "buttonRadius",
    type: '"auto" | "full" | number',
    default: '"auto"',
    description:
      "The mic's corners. \"auto\" is visually concentric with the field's.",
  },
  {
    prop: "labels",
    type: "Partial<DictationInputLabels>",
    description:
      "Every string, including problems and screen-reader announcements.",
  },
])

/** The public API, in the order people reach for it. */
const API: { name: string; description: string; rows: readonly ApiRow[] }[] = [
  {
    name: "DictationInput",
    description:
      "The field with the mic in its corner. Every other prop goes to the root element.",
    rows: VOICE_INPUT_ROWS,
  },
  {
    name: "VoiceTranscriptionError",
    description:
      "Throw it from onTranscribe to show the right message under the field.",
    rows: [
      {
        prop: "code",
        type: '"empty" | "unconfigured" | "failed"',
        description:
          '"empty": nothing was said. "unconfigured": no transcription key on the server. "failed": anything else; the take is kept and "Try again" resends it.',
      },
    ],
  },
]
