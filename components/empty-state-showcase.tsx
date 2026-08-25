"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const installCommand =
  "pnpm dlx shadcn@latest add https://labs.launchstudio.space/r/empty-state.json"

function CopyButtonIcon({ copied }: { copied: boolean }) {
  return (
    <span className="relative size-4 shrink-0">
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
          copied
            ? "scale-[0.25] opacity-0 blur-[4px]"
            : "blur-0 scale-100 opacity-100"
        )}
      >
        <CopyIcon className="size-4" />
      </span>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
          copied
            ? "blur-0 scale-100 opacity-100"
            : "scale-[0.25] opacity-0 blur-[4px]"
        )}
      >
        <CheckIcon className="size-4" />
      </span>
    </span>
  )
}

export function EmptyStateShowcase() {
  const [copied, setCopied] = useState(false)

  function copyCommand() {
    void navigator.clipboard.writeText(installCommand)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

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
        <Button
          aria-label="Copy install command"
          size="lg"
          onClick={copyCommand}
        >
          <CopyButtonIcon copied={copied} />
          {copied ? "Copied" : "Copy"}
        </Button>
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
