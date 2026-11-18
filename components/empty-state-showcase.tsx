"use client"

import { PageHeader } from "@/components/page-header"
import { CopyButton } from "@/components/copy-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import {
  EMPTY_STATE_VARIANT,
  EmptyStateDemo,
} from "@/components/demos/empty-state-demo"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const installCommand =
  "pnpm dlx shadcn@latest add https://labs.launchstudio.space/r/empty-state.json"

export function EmptyStateShowcase() {
  return (
    <>
      <PageHeader href="/" />

      <div className="labs-enter labs-enter-delay-2 flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger
            render={
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" />
            }
          >
            {installCommand}
          </TooltipTrigger>
          <TooltipContent className="max-w-sm font-mono text-xs break-all">
            {installCommand}
          </TooltipContent>
        </Tooltip>
        <CopyButton text={installCommand} aria-label="Copy install command" />
      </div>

      <Tabs defaultValue="preview" className="labs-enter labs-enter-delay-3">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>

        {/* The same demo the playground renders, so the preview here and
            the capture there can never drift apart. */}
        <TabsContent value="preview">
          <EmptyStateDemo />
        </TabsContent>

        <TabsContent value="code">
          <Card>
            <CardHeader>
              <h3 className="font-heading text-base font-medium">Usage</h3>
              <CardDescription className="text-pretty">
                Pick one of five variants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg bg-muted p-5 font-mono text-xs leading-normal">
                <code>
                  {`import { EmptyState } from "@/components/ui/empty-state"\n\n<EmptyState\n  variant="${EMPTY_STATE_VARIANT}"\n  onAction={() => {}}\n/>`}
                </code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
