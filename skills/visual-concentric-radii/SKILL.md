---
name: visual-concentric-radii
description: Add the visually concentric radius rule (outer − padding, with a floor so small inner corners never go sharp) to a project, written in whatever way the project already styles things. Looks at the project first, proposes a short plan and waits for the user's OK, then adds one reusable utility. Use when asked for concentric radii, nested border radius, inner corner radius, or corners that "look off" inside rounded containers.
---

# Visually concentric radii

You are adding **visually concentric radii** from Launch Studio Labs to the
user's project: one reusable utility that gives an element nested in a
rounded parent the right corner radius. Docs and live demo:
https://labs.launchstudio.space/concentric-radii

## The rule

```
floor = max(outer / 2, min(2px, outer))
inner = max(outer − padding, floor)   while padding ≤ outer
inner = the element's own radius      once padding > outer
```

- `outer − padding` keeps both curves on one centre.
- The floor stops small radii going sharp: never under half the outer
  radius, and never under 2px — unless the parent itself is under 2px, so a
  square parent keeps a square child.
- Once the padding is bigger than the outer radius the corners no longer
  read as a pair; leave the child's own radius alone.

As a single CSS declaration, with the parent supplying `--outer` and
`--padding`:

```css
border-radius: max(
  var(--outer) - var(--padding),
  var(--outer) * 0.5,
  min(2px, var(--outer))
);
```

That declaration is the reference. Express it in whatever form the project
uses; the maths must stay the same.

## How you work

1. **Read** the project: how to add the utility, and where it would replace
   radii already in use.
2. **Ask for the OK**: how you'll add it, and a table of places to use it.
   Then **stop and wait**.
3. **Do** what the user confirmed, and nothing else.

Nothing is written before the OK. Silence or a question is not approval.

## 1. Read the project

Start from what the user told you. Then work out, from the project itself:

- **How to add it**: how styles are written here (the convention the
  existing components actually follow), where shared styling lives, and any
  radius tokens or nested-radius logic to reuse.
- **Where it would be useful**: existing rounded elements inside rounded,
  padded parents whose radius is set by hand today. For each, note the
  outer radius, the padding, the current inner radius and what the rule
  gives. Skip places where the padding is bigger than the outer radius, and
  ones the rule wouldn't change.

If you can't tell how the project styles things, ask instead of guessing.

## 2. Ask for the OK

One message, two parts:

```markdown
**Visually concentric radii** (nothing changed yet)

**How I'll add it:** one or two sentences: the utility's name, the file it
goes in, and how a parent and child use it.

**Where to use it:** confirm the rows you want.

| # | Where | Outer / padding | Now | With the rule |
| - | ----- | --------------- | --- | ------------- |
| 1 | `search-field.tsx`: submit button | 8px / 4px | 2px | 4px |
| 2 | `card.tsx`: image | 12px / 12px | 0px | 6px |

Reply **OK** for all, the numbers you want (e.g. "1, 3"), or "just the
utility".
```

Then end your turn.

## 3. Do what was confirmed

- Add **one** reusable utility in the project's own idiom, next to its other
  shared styles, matching naming and formatting. Call it
  `rounded-concentric` or the closest fit to the project's naming.
- Reuse the project's existing radius tokens and names where they fit;
  otherwise use `--outer` and `--padding`.
- Keep `max()` / `min()` resolving in the browser, so it works with any
  values the parent sets at runtime.
- No new dependencies or build steps.
- Replace only the confirmed rows. Take the outer radius and padding from
  values the parent already uses, so nothing else moves.

**Verify** with the project's own checks, then confirm one nested element's
computed radius: 8px outer, 4px padding → 4px; 16px, 12px → 8px; 7.2px, 4px
→ 3.6px.

**Report** the utility and how to use it, and the places you changed.
