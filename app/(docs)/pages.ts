/**
 * Every page in the docs, in nav order.
 *
 * A page's title is written once, here. The sidebar shows it, `PageHeader`
 * prints it, and the document title is built from it — nothing keeps a second
 * copy, so the three can never drift apart.
 */
export const docsPages = {
  "/": { title: "Empty state", section: "Library" },
  "/typography": { title: "Width & line height", section: "Practices" },
} as const satisfies Record<string, { title: string; section: string }>

export type DocsHref = keyof typeof docsPages

const SITE_NAME = "Launch Studio Labs"

/** What the browser tab reads: the page's own title, then the site's. */
export function docsTitle(href: DocsHref) {
  return `${docsPages[href].title} — ${SITE_NAME}`
}
