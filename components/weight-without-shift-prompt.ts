/**
 * The prompt the "Weight without shift" page hands to a coding assistant.
 * Kept in its own file so the page shows and copies exactly the same text.
 */
export const WEIGHT_WITHOUT_SHIFT_PROMPT = `Find every place in this codebase where a font-weight change makes an element change size or shifts the layout. List them, wait for my approval, then fix only the ones I approve.

## The problem
Heavier weights draw wider letters. When a label's font-weight changes with its state (selected, active, current page, hover, focus, open, checked), the label's box grows, the items next to it move, and anything measured from it (an underline, an indicator, a pill, a wrapping row, truncation) jumps.

## Step 1: Find every instance
Search the whole codebase, in every styling system:
- Tailwind state variants: data-[state=active]:font-semibold, data-[selected]:font-bold, aria-selected:font-bold, aria-pressed:font-semibold, aria-[current=page]:font-semibold, hover:font-semibold, focus-visible:font-medium, active:font-bold, group-hover:font-bold, peer-checked:font-bold
- Conditional classes: cn(isActive && "font-bold"), clsx({ "font-semibold": selected }), ternaries inside className
- CSS, SCSS, CSS modules: font-weight inside [aria-selected="true"], [aria-current], [data-state="active"], .active, .is-selected, :hover, :focus, :focus-visible, :checked, :active and similar
- CSS-in-JS, styled-components, inline styles: a fontWeight that depends on props or state
Usual suspects: tabs, nav and sidebar links, filter chips, segmented controls, buttons, menus, breadcrumbs, pagination.
Skip a case only if it cannot shift: the element has a fixed width wider than its heavier text, and nothing is measured from it. If unsure, include it and say why.

## Step 2: Report. Do not change any code yet
Reply with a numbered list, one item per instance:
N. path/to/file.tsx:LINE (Component): what changes, e.g. 400 → 600 when selected. One line on what shifts.
End with: Reply "fix all", or pick numbers, e.g. "fix 1 and 3".
Then stop and wait for my reply.

## Step 3: Fix only what I approve
Reserve the heavier width, so each label is already as wide as its heavier self before the weight changes. Keep the existing weight change; only add the reservation.

Plain-text label: wrap the text and put a hidden heavier copy in ::after.
  <span class="weight-reserve" data-text="Branding">Branding</span>

  .weight-reserve {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
  }
  .weight-reserve::after {
    content: attr(data-text);
    font-weight: 600; /* its heaviest weight */
    height: 0;
    overflow: hidden;
    visibility: hidden;
    pointer-events: none;
    user-select: none;
  }

Tailwind: inline-flex flex-col items-center after:invisible after:h-0 after:overflow-hidden after:pointer-events-none after:select-none after:font-semibold after:content-[attr(data-text)]

Label with icons or markup, or ::after already in use: use a real element for the copy instead.
  <span class="weight-reserve">
    <span>Branding</span>
    <span class="weight-copy" aria-hidden="true">Branding</span>
  </span>
  (.weight-copy gets the same styles as the ::after above, minus content.)

Rules:
- The copy's weight is the heaviest weight the label reaches in any state.
- data-text, or the copy's text, must match the visible label exactly. For dynamic labels, pass the same variable.
- The copy stays hidden from screen readers and from copy/paste: visibility: hidden and user-select: none, plus aria-hidden="true" when it is a real element.
- Change nothing else about styles, behaviour or markup.

## Step 4: Verify and summarise
For each fix, confirm the element is the same width in every state. Measure it in a browser if you can; otherwise reason it through from the CSS and say so. Then list what you changed, file by file, and anything you skipped and why.

## Example
You:
1. components/site-nav.tsx:42 (NavLink): 400 → 600 on the current page. The current link widens and pushes the links after it.
2. components/ui/tabs.tsx:57 (TabsTrigger): 500 → 600 when selected. The selected tab grows, so the underline jumps.
3. app/work/filters.tsx:18 (FilterChip): 500 → 600 when on. The chip grows and the row rewraps.
Reply "fix all", or pick numbers, e.g. "fix 1 and 3".

Me: fix 1 and 3

You: Add the reserved copy to NavLink (600) and FilterChip (600), leave tabs.tsx as it is, check both stay the same width in every state, then summarise the two changes.`
