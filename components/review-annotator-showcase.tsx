import Image from "next/image"
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

const GITHUB_URL = "https://github.com/Launch-Studio-Labs/review-annotator"

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/igcjmdghfpkpfphbpbndllonafibgebk"

/**
 * A tool page: what it is, how it looks, where to get it. The extension
 * itself is not rebuilt here — the screenshot is the visual.
 */
export function ReviewAnnotatorShowcase() {
  return (
    <>
      <PageHeader href="/review-annotator" />

      <p className="labs-enter labs-enter-delay-2 text-sm leading-normal text-body">
        A small browser extension for drawing on any site during a review.
        Annotations stay pinned to the page as you scroll. Toggle it with{" "}
        <kbd className="rounded border border-border px-1 font-mono text-xs">
          Alt+Shift+A
        </kbd>
        .
      </p>

      <div className="labs-enter labs-enter-delay-3 flex flex-wrap gap-2">
        <Button
          size="lg"
          nativeButton={false}
          render={
            <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer" />
          }
        >
          Add to Chrome
        </Button>
        <Button
          size="lg"
          variant="secondary"
          nativeButton={false}
          render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
        >
          <GithubLogoIcon data-icon="inline-start" />
          View on GitHub
        </Button>
      </div>

      <Image
        data-breakout
        src="/review-annotator/screenshot.png"
        width={2560}
        height={1600}
        alt="The annotator toolbar over a website, with circled, highlighted, and noted parts"
        sizes="(min-width: 1024px) 60rem, 100vw"
        priority
        className="labs-enter labs-enter-delay-4 mx-auto h-auto w-full max-w-5xl rounded-xl border border-border"
      />
    </>
  )
}
