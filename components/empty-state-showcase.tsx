"use client"

import { CodeBlock, Command } from "@/components/code-block"
import {
  EMPTY_STATE_VARIANT,
  EmptyStateDemo,
} from "@/components/demos/empty-state-demo"
import { ApiTable, propTable } from "@/components/docs/api-reference"
import { Code, Section } from "@/components/docs/section"
import { Steps } from "@/components/docs/steps"
import { PageHeader } from "@/components/page-header"
import { Prose } from "@/components/prose"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { EmptyStateProps } from "@/components/ui/empty-state"
import { useRegistryOrigin } from "@/lib/use-registry-origin"

const REPO = "https://github.com/Launch-Studio-Labs/launchstudio-labs/blob/main"
const FILE = "components/ui/empty-state.tsx"

const LINK =
  "font-medium text-foreground underline decoration-foreground/20 underline-offset-2 hover:decoration-foreground/60"

const USAGE = `import { EmptyState } from "@/components/ui/empty-state"

<EmptyState
  variant="${EMPTY_STATE_VARIANT}"
  onAction={() => clearFilters()}
/>

// Your own words, same layout.
<EmptyState
  variant="empty-feed"
  title="No posts yet"
  description="Posts from the people you follow will show up here."
  actionLabel="Find people"
  onAction={openDirectory}
/>`

const ROWS = propTable<keyof EmptyStateProps>()([
  {
    prop: "variant",
    type: '"no-results" | "empty-feed" | "no-access" | "onboarding" | "error"',
    default: '"no-results"',
    description:
      "Which case it covers: sets the icon, the eyebrow and the default copy.",
  },
  {
    prop: "title",
    type: "string",
    description: "Replaces the variant's title.",
  },
  {
    prop: "description",
    type: "string",
    description: "Replaces the variant's description.",
  },
  {
    prop: "actionLabel",
    type: "string",
    description: "Replaces the button's label.",
  },
  {
    prop: "onAction",
    type: "() => void",
    description: "The button was pressed.",
  },
  {
    prop: "children",
    type: "ReactNode",
    description: "Anything to add under the button, such as a secondary link.",
  },
  {
    prop: "className",
    type: "string",
    description: "Classes for the card around it.",
  },
])

/**
 * A library page in the shared order (DESIGN.md › Spacing & layout): what it
 * is, the component itself, then installation, usage and its API. It has one
 * state and nothing to walk through, so no steps and no States section; it
 * has no skill, so Installation has no Prompt tab.
 */
export function EmptyStateShowcase() {
  const origin = useRegistryOrigin()
  const registryCommand = `npx shadcn@latest add ${origin}/r/empty-state.json`

  return (
    <>
      <div className="labs-enter labs-enter-delay-1 flex flex-col gap-4">
        <PageHeader href="/" animated={false} />
        <p className="text-sm leading-normal text-pretty text-body">
          A ready-made screen for when there&apos;s nothing to show yet: an
          icon, a short message and one clear next step. Five variants cover the
          usual cases: no search results, an empty feed, no access, onboarding
          and a failed load.
        </p>
      </div>

      {/* The same demo the playground renders, so the two never drift. */}
      <EmptyStateDemo className="labs-enter labs-enter-delay-2" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <Section title="Installation" className="labs-enter labs-enter-delay-3">
        <Tabs defaultValue="registry" className="gap-6">
          <TabsList>
            <TabsTrigger value="registry">shadcn registry</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="registry" className="flex flex-col gap-3">
            <Command text={registryCommand} />
            <Prose>
              <p>
                Adds <Code>{FILE}</Code>, installs the Phosphor icons, and pulls
                in shadcn&apos;s <Code>button</Code>, <Code>card</Code> and{" "}
                <Code>empty</Code> if you don&apos;t have them.
              </p>
            </Prose>
          </TabsContent>
          <TabsContent value="manual">
            <Steps
              className="gap-6"
              steps={[
                {
                  title: "Install the icons",
                  body: <Command text="npm install @phosphor-icons/react" />,
                },
                {
                  title: "Add the shadcn primitives it builds on",
                  body: (
                    <Command text="npx shadcn@latest add button card empty" />
                  ),
                },
                {
                  title: "Copy the file",
                  body: (
                    <>
                      <a
                        href={`${REPO}/${FILE}`}
                        className={`${LINK} font-mono text-xs`}
                      >
                        {FILE}
                      </a>
                      <p>
                        It imports from <Code>@/components/ui</Code> and{" "}
                        <Code>@/lib/utils</Code>. Change the paths if your
                        aliases differ.
                      </p>
                    </>
                  ),
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
        <ApiTable
          name="EmptyState"
          description="A card with the variant's icon, copy and one action."
          rows={ROWS}
        />
      </Section>
    </>
  )
}
