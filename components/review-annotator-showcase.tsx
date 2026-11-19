import Image from "next/image"
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

const GITHUB_URL = "https://github.com/Launch-Studio-Labs/review-annotator"

/**
 * The Chrome Web Store listing is not live yet. Leave this empty until it is:
 * the "Add to Chrome" link renders only once a real URL is set here.
 */
const CHROME_STORE_URL = ""

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
        Annotations stay pinned to the page as you scroll.
      </p>

      <Image
        data-breakout
        src="/review-annotator/screenshot.png"
        width={2560}
        height={1600}
        alt="The annotator toolbar over a website, with circled, highlighted, and noted parts"
        sizes="(min-width: 1024px) 60rem, 100vw"
        priority
        className="labs-enter labs-enter-delay-3 mx-auto h-auto w-full max-w-5xl rounded-xl border border-border"
      />

      <div className="labs-enter labs-enter-delay-4 flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            nativeButton={false}
            render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
          >
            <GithubLogoIcon data-icon="inline-start" />
            View on GitHub
          </Button>
          {CHROME_STORE_URL ? (
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={
                <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer" />
              }
            >
              Add to Chrome
            </Button>
          ) : null}
        </div>

        <p className="text-sm leading-normal text-body">
          To install, clone the repo and load it unpacked from{" "}
          <code className="font-mono text-xs">chrome://extensions</code> with
          Developer mode on. Works in Dia and other Chromium browsers. Toggle it
          with{" "}
          <kbd className="rounded border border-border px-1 font-mono text-xs">
            Alt+Shift+A
          </kbd>
          .
        </p>
      </div>
    </>
  )
}
