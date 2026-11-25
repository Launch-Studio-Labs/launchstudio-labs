import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Two elements have one home each (DESIGN.md). A page's headline is
  // PageHeader's: it prints the title from app/(docs)/pages.ts, the same
  // string the sidebar shows, so a raw <h1> could say something different.
  // Code is CodeBlock's: its scroll sits inside the box on a transparent
  // track, and a raw <pre> would bring its own. Text has no em or en dashes
  // (DESIGN.md › Copy); comments may. (One block: ESLint lets a
  // later block for the same rule replace an earlier one.)
  {
    files: ["{app,components,lib,hooks}/**/*.{ts,tsx}"],
    ignores: [
      "components/page-header.tsx",
      "components/code-block.tsx",
      "components/ui/code-block.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='h1']",
          message:
            "Use <PageHeader href=…> for a page's headline, so it matches the sidebar label in app/(docs)/pages.ts.",
        },
        {
          selector: "JSXOpeningElement[name.name='pre']",
          message: "Use <CodeBlock code=…> from components/code-block.tsx.",
        },
        ...[
          "Literal[value=/[\\u2013\\u2014]/]",
          "JSXText[value=/[\\u2013\\u2014]/]",
          "TemplateElement[value.raw=/[\\u2013\\u2014]/]",
        ].map((selector) => ({
          selector,
          message:
            'No em or en dashes in site text (DESIGN.md). Use a colon, comma, full stop, brackets or "to".',
        })),
      ],
    },
  },
  {
    files: ["hooks/use-mobile.ts"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
