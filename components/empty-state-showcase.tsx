import { EmptyStateDemo } from "@/components/demos/empty-state-demo"
import { EmptyStateMatrixDemo } from "@/components/demos/empty-state-matrix-demo"
import {
  EMPTY_STATE_TYPES,
  EMPTY_STATES,
} from "@/components/empty-states/states"
import { EMPTY_STATE_STYLES } from "@/components/empty-states/styles"
import { PageHeader } from "@/components/page-header"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/**
 * A name and a line about it, as a two-column list: the name in full ink,
 * the line set back as body copy. Used for both the states and the styles.
 */
function Glossary({
  items,
  className,
}: {
  items: readonly { term: string; detail: string }[]
  className?: string
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[6rem_minmax(0,1fr)] gap-x-6 gap-y-3 text-sm leading-normal",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.term} className="contents">
          <dt className="font-medium text-foreground">{item.term}</dt>
          <dd className="text-body">{item.detail}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * An exploration, not a finished component: six states every product meets,
 * each drawn in four directions, so one can be picked and packaged. The page
 * opens on one state at full size, then lays out the whole set.
 */
export function EmptyStateShowcase() {
  return (
    <>
      <PageHeader href="/" />

      <div className="labs-enter labs-enter-delay-2 flex flex-col gap-[1lh] text-sm leading-normal text-body">
        <p>
          An empty state is what a screen shows when there’s nothing to show.
          It’s often the first thing a new user sees, so it should{" "}
          <strong className="font-medium text-foreground">
            say why it’s empty and what to do next
          </strong>
          .
        </p>
        <p>
          This is an exploration:{" "}
          <strong className="font-medium text-foreground">
            six common empty states, each drawn in four directions
          </strong>
          . All black and white, and all of them move, on their own or under the
          cursor. One direction gets picked and packaged.
        </p>
      </div>

      <EmptyStateDemo className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <p className="labs-enter labs-enter-delay-3 text-sm leading-normal text-body">
        <strong className="font-medium text-foreground">
          Every state in every style.
        </strong>{" "}
        Read across a row to see if a style holds together, and down a column to
        compare four takes on the same moment. Hover a tile to see it react.
      </p>

      <EmptyStateMatrixDemo
        data-breakout
        className="labs-enter labs-enter-delay-3"
      />

      <Separator className="labs-enter labs-enter-delay-4" />

      <div className="labs-enter labs-enter-delay-4 flex flex-col gap-6">
        <h2 className="text-base font-medium">The states</h2>
        <Glossary
          items={EMPTY_STATE_TYPES.map((type) => ({
            term: EMPTY_STATES[type].name,
            detail: EMPTY_STATES[type].when,
          }))}
        />
      </div>

      <div className="labs-enter labs-enter-delay-4 flex flex-col gap-6">
        <h2 className="text-base font-medium">The styles</h2>
        <Glossary
          items={EMPTY_STATE_STYLES.map((style) => ({
            term: style.name,
            detail: style.summary,
          }))}
        />
      </div>
    </>
  )
}
