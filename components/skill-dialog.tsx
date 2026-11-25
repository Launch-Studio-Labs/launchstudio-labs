"use client"

import { FileTextIcon } from "@phosphor-icons/react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/**
 * The skill the prompt points at, readable in place: SKILL.md rendered as
 * Markdown and set with Typeset (app/typeset.css). The text comes from the
 * file at build time, so it is always the one the agent will fetch.
 */
export function SkillDialog({
  skill,
  title,
}: {
  /** SKILL.md without its frontmatter. */
  skill: string
  /** The dialog's title, e.g. "Dictation Input skill". */
  title: string
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 pr-3 pl-2.5 text-xs"
          />
        }
      >
        <FileTextIcon />
        View skill
      </DialogTrigger>
      {/* shadcn's dialog as documented, with scrollable content — only
          wider, for reading. The corner button closes it. */}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            What your agent follows when you paste the prompt.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
          <article className="typeset typeset-skill">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {skill}
            </Markdown>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  )
}
