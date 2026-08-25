import { docsPages, type DocsHref } from "@/app/(docs)/pages"

/**
 * The line every page opens with. It takes the route rather than a string:
 * the title is the page list's to give, so the heading here and the entry in
 * the sidebar are the same words by construction.
 *
 * It sets no bottom margin: the shell's grid spaces it from whatever follows,
 * the same as every other block.
 */
export function PageHeader({ href }: { href: DocsHref }) {
  return (
    /* Set on the line rather than run loose: 20px over 24px. */
    <h1 className="labs-enter labs-enter-delay-1 text-xl leading-6 font-medium">
      {docsPages[href].title}
    </h1>
  )
}
