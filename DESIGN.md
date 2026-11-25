# Design rules

Taste this project has been corrected into. Every rule traces back to a
correction or a confirmed choice; the comment under each holds the date and
the words. Spacing steps, the content measure and page titles are in
`AGENTS.md`.

Rules marked **(check)** are enforced by a lint rule, a script or a type, so
breaking them fails `pnpm lint` or `pnpm typecheck`.

## Surfaces

- **A rounded element nested in a rounded container takes its radius from
  `visualConcentricRadius` (`lib/visual-concentric-radius.ts`):
  `min(R, max(R − inset, R × 0.5, 5px), size / 2)`. Never plain `R − inset`.**
  A square container keeps a square child; a pill container gets a circle.
  Why: the textbook rule leaves near-sharp inner corners at small radii (a
  7.2px field with a 4px inset gives 3.2px; 8px with 8px gives 0), and that
  "does not look visually right."
  <!-- 2026-11: "the inner voice button has totally sharp corners… does not look visually right… the inner one should never go under a certain limit" -->

- **Numbered step lists in docs use `Steps` (`components/docs/steps.tsx`):
  24px muted round number badges 12px from the text, title 14px medium, body
  14px muted, 16px between steps, and a 1px dashed connector (3px on, 3px off,
  `foreground/20`) from each badge down to the next, 4px clear of both.**
  Why: the steps read as one sequence rather than separate notes.
  <!-- 2026-11-24: "add dashed lines between the numbered steps … so they are connected" -->

- **Dialogs use shadcn's Base UI `Dialog` exactly as its docs show. Long
  content scrolls in `-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4`
  under the header. The only change allowed is width (`sm:max-w-*`). Close
  with the corner X; no footer unless the dialog has an action.**
  Why: the hand-tuned version "is weird"; the stock one already looks right.
  <!-- 2026-11-24: "pls use https://ui.shadcn.com/docs/components/base/dialog for the skill dialog and any dialogs" · "the whole thing is weird tbh, see how shadcn default does scrollable content" · "remove the whole footer" -->

- **Code goes in `CodeBlock` (`components/code-block.tsx`) (check): padding on
  the outer box, the scroll on the code inside it, so the scrollbar runs
  inside the box with 8px under the code, a transparent track and a thin
  `foreground/20` thumb. Never a raw `<pre>`.**
  Why: a scrollbar along the box's rim reads as part of the page, not the code.
  <!-- 2026-11-24: "make the scrollbar track here part of the inner codebox, and make the track invisible" -->

## Typography

- **Page headlines are 24px (`text-2xl leading-6 font-medium tracking-tight`)
  on every page, set by `PageHeader`. Pages never resize them.**
  Why: the Figma pass set the headline at 24px, and it holds for all pages.
  <!-- 2026-11-24: "Let's do 24 pixels for all pages." -->

- **An API Reference is one shadcn-style table per export (`ApiTable` in
  `components/docs/api-reference.tsx`): Prop / Type / Default / Description,
  fixed layout at 30% / 21% / 16% / 33%. Every cell keeps 16px right padding
  as the minimum gap between columns and wraps a value that can't fit rather
  than crossing into the next column. Every value is a code pill; an empty
  default is "-".**
  Why: it's the shadcn pattern, the description gets a third of the row, and
  long prop names were running into their neighbours.
  <!-- 2026-11-24: "add API reference section like shadcn does" · "the description col should be 1/3 of the width of the whole row" · "enforce some small min gap between the cols in the api table" -->

- **API table rows are grouped by purpose: the field or value, the main
  callback and its limits, privacy and policy, other events, look, then text.
  A setting sits next to its own callback.**
  Why: so the table reads in the order you wire the component.
  <!-- 2026-11-24: "pls order them in some logical way so its displayed nicely in the table" -->

- **An API table lists exactly the component's own props, built with
  `propTable()` against its `…OwnProps` type (check).** Props for docs or tests
  only (`preview`, `getStream`) are named as left out, not listed.
  Why: the table must never drift from the component.
  <!-- 2026-11-24: "I don't want there to be any disconnect" -->

## Spacing & layout

- **Every library page runs in this order:**
  1. headline (`PageHeader`), with an "Add with a prompt" button when the
     component has a skill
  2. one paragraph saying what it is
  3. the component working: an auto-playing example of its whole flow when it
     has one, else the component itself
  4. numbered "how it works" steps, when the behaviour needs explaining
  5. **States**, with the controls: only when it has more than one state
  6. `<Separator />`
  7. **Installation**
  8. **Usage**: code only
  9. **API Reference**
  10. **Credit**, when it uses someone else's work

  Why: see it working and understand it before any setup detail.
  <!-- 2026-11-24: "first section should be just the intro … and then immediately the component itself" · "below the description … the whole process … then the four steps … then a section … called states" · "let's do it for every library page, but if the component has just one state … we would not add the states section" -->

- **Installation is one section with tabs, in this order: Prompt, shadcn
  registry, Manual. Prompt is first and selected by default; a component
  without a skill has no Prompt tab. The Prompt tab holds the line "Copy this
  into your coding agent…", the numbered steps and the prompt box (primary
  "Copy prompt", secondary "View skill"), nothing else.**
  The Prompt tab spaces its blocks 32px apart. That is an exception to the
  24px step, made for this tab only.
  Why: the skill is the default way in; manual install is only "if someone
  wants to install it manually."
  <!-- 2026-11-24: "merge … into one section called installation … three tabs … prompt being the first and being the default" · "please do the 32 pixels because visually it just looks better here … an exception here" · "remove this" (the npx skills add block) -->

- **Demo cards inside a `DemoFrame` fill its width; the frame pads 24px (16px
  under `sm`). Never cap a card's width inside a frame.**
  Why: a narrow card in a wide frame wastes it and reads as unfinished.
  <!-- 2026-11-24: "stretch the white boxes inside and fields to be full width of the container, with apropriate edge padding" -->

- **A States section shows one state per tab (Default, Active, Done…), and
  every tab shows every variant of the component (for a field: single-line and
  multi-line). The controls under the frame drive whichever tab is open.**
  Why: one state at a time keeps the frame short; every variant proves the
  state holds for all of them.
  <!-- 2026-11-24: "add tabs here to switch between different states … display both the text area and the single line text input" -->

- **"On This Page" (`components/docs-toc.tsx`) shows on pages with two or more
  section headings, from `xl`, 24px from the right edge of the screen. On
  those pages the content column centres between the sidebar and the list.**
  Why: the list belongs at the screen's edge, and with it there the column
  looked off-centre.
  <!-- 2026-11-24: "on the right side of the page for each page with 2+ headings" · "has to be all the way on the right of the screen" · "is the main content not centered since we added the table of contents?" → "yep lets do that" -->

- **Tables, API tables included, stay at the content measure. They never
  break out of the column.**
  Why: a wider table broke the page's single reading edge.
  <!-- 2026-11-24: "make just the table in the api reference wider" → "nvm lets put it back" -->

## Motion

- **A demo whose content changes height never moves the page: the frame is
  sized to the tallest state (an invisible copy of that state shares its
  cell), and only the inner card eases its height, 300ms ease-out, instant
  with reduced motion.**
  Why: even animated, a resizing demo makes "the whole page sort of jump up
  and down."
  <!-- 2026-11-24: "make sure to transition the container sizes" · "have the box height fixed … so it doesn't affect the page and just the inside white box will change the height" -->

## Interaction

- **A component's public API is minimal. No props that only fine-tune a
  default (strength, alternate radii, theme overrides); no switches that hide
  part of the default experience; no uncontrolled `default*` twin when a
  controlled prop exists; one enum instead of related booleans.**
  Why: a long prop list reads as "way too extensive and vibe coded."
  <!-- 2026-11-24: "the API reference seems kinda crazy … way too extensive" · "remove the ones that no one ever need" · "pick vs force send vs force not send … not sure if we will need showRecordingToggle" -->

## Copy

- **A copyable prompt is three parts and nothing else: one sentence naming the
  component, then `Skill (follow it): <url>`, a blank line, then `Component
  (shadcn registry item): <url>`. URLs use the page's own origin (localhost
  and `*.ts.net` use production).**
  Why: short; the skill carries the workflow.
  <!-- 2026-11: "remove the final line after you listed the links, and add a new line between the skill link and the component" -->

- **Docs don't explain behaviour or props in prose paragraphs. Behaviour goes
  in the "how it works" steps, props in the API Reference; Usage is code
  only.**
  Why: the steps and the table carry it; prose under them repeated it.
  <!-- 2026-11-24: "remove this" (the paragraphs under Usage and the install intro) · "remove the Recordings and privacy section as well" -->

- **A library component's name says what it is by default (the base element),
  with the feature as a modifier, in three words at most: Dictation Input,
  not Voice Input.**
  Why: the old name didn't "reflect that it's a text field by default."
  <!-- 2026-11-24: "I dont like that it doesnt relfacet that its a text field by default. Has to bne max 3 words" → "Dictation Input" -->

- **Site text has no em (—) or en (–) dashes: in pages, components, titles,
  the registry and skill files (check). Use a colon, a comma, a full stop,
  brackets, or "to" for a range. Code comments may keep them.**
  Why: house style for every line a visitor or an agent reads; the plainer
  punctuation says the same thing.
  <!-- 2026-11-24: "remove any em/en dashes from the site texts add it to the desig nmd guideliens too" -->

- **Agent skill files (`skills/**/*.md`) have no emoji, no `---` rules outside
  the frontmatter and no blockquotes (check).**
  Why: the skill is read as formatted text in "View skill" and by agents;
  decoration is noise for both.
  <!-- 2026-11-24: "remove any emojis, dividers, or quote blocks from the skill" -->
