Use shadcn as the component foundation whenever an appropriate primitive exists. Before introducing a new component, check the official shadcn library and relevant registry.

Restyle shadcn defaults instead of adding Launch-specific variants:

- Rewrite secondary rather than creating launchSecondary.
- Rewrite the shared card surface rather than creating LaunchCard.
- Compose existing primitives before creating custom markup.
- Add a custom variant only when the component cannot express a genuinely different semantic behavior.
## Layout and spacing

The shell owns the page's vertical rhythm. `AppShell` lays every page out as a
grid with a **48px gap between top-level blocks**, so a page is a flat list of
blocks and never sets its own `mt-*` / `mb-*` on them. If two things want to sit
closer together, they are one block: wrap them and space them from the inside.

Inside a block, the steps are:

- **24px** between parts of one idea — a control row and the thing it drives.
- **12px** inside a panel — its meta row and its content.
- **8px** between a title and its description.
- **one blank line** between paragraphs of prose (`gap-[1lh]`, so the gap moves
  with the type rather than drifting from it).

Other rules that hold across pages:

- The measure is `--container-content` (36rem). The shell centres the content
  column on it; a block that must run wider marks itself `data-breakout` and
  then holds the measure itself for any controls inside, so those stay on the
  same lane as the prose above.
- Separate sections with `<Separator />` as its own block, not with a border on
  the edge of a neighbouring one — a border rides that block's box and reads as
  belonging to it.
- Vertical space comes from `gap`, not margins, everywhere.

## Page titles

A docs page is named once, in `app/(docs)/pages.ts`. That entry is the source
of truth: `PageHeader` takes the route and prints the title from the list, the
sidebar is built from the same list, and the document title is `docsTitle()` of
it. Adding a page means adding it there — and renaming one means editing one
string, not three.

## Demos and the playground

Every interactive piece lives once, in `components/demos`, and is listed in
`components/demos/registry.ts`. A docs page imports the demo and writes the
prose around it; `/playground/<id>` renders the same component alone on a bare
canvas, for screenshots and screen recordings. Adding a demo to the registry is
all it takes to give it a playground route.

So a demo carries its own controls, its own state, and its own measurements,
and never leans on the page around it:

- It holds the measure itself (`w-content max-w-full`) rather than inheriting a
  width from the shell's content column.
- It takes `className` and spreads the rest onto its root, so the page can mark
  it `data-breakout` or hang an entrance animation on it without the demo
  knowing about either.
- Nothing docs-specific — headings, captions, install commands — goes inside a
  demo. The playground canvas shows exactly what the demo renders.

The playground is unlisted: no nav links to it, and it asks search engines to
keep out.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
