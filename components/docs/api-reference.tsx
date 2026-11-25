import { Code } from "@/components/docs/section"

export type ApiRow = {
  prop: string
  type: string
  default?: string
  description: string
}

/**
 * Ties an API table to the component's type, so the two can't drift: a row
 * for a prop that no longer exists doesn't compile, and neither does a new
 * prop without a row — the error names it. `Documented` is the component's
 * own props minus any left out on purpose:
 *
 *   propTable<Exclude<keyof FooOwnProps, "testOnly">>()([...rows])
 */
export function propTable<Documented extends string>() {
  return <const R extends readonly (ApiRow & { prop: Documented })[]>(
    rows: R &
      ([Exclude<Documented, R[number]["prop"]>] extends [never]
        ? unknown
        : { missingFromApiTable: Exclude<Documented, R[number]["prop"]> })
  ): R => rows
}

/**
 * One export's API, the shadcn way: its name, a line about it, and a table of
 * Prop / Type / Default / Description (DESIGN.md › Typography).
 */
export function ApiTable({
  name,
  description,
  rows,
}: {
  name: string
  description: string
  rows: readonly ApiRow[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">{name}</h3>
        <p className="text-sm leading-normal text-pretty text-body">
          {description}
        </p>
      </div>
      {/* Scrolls sideways on a phone rather than crushing the columns. */}
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        {/* Fixed layout, so the columns keep their shares whatever the
            content: the description always gets a third of the row. */}
        <table className="w-full min-w-[36rem] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-[30%] py-2 pr-4 font-medium">Prop</th>
              <th className="w-[21%] py-2 pr-4 font-medium">Type</th>
              <th className="w-[16%] py-2 pr-4 font-medium">Default</th>
              <th className="w-1/3 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.prop}
                // A value that can't fit wraps rather than running into the
                // next column: the cells' right padding is the minimum gap.
                className="border-b border-border align-top [&>td]:[overflow-wrap:anywhere]"
              >
                <td className="py-3 pr-4">
                  <Code>{row.prop}</Code>
                </td>
                <td className="py-3 pr-4">
                  <Code>{row.type}</Code>
                </td>
                <td className="py-3 pr-4 text-body">
                  {row.default ? <Code>{row.default}</Code> : "-"}
                </td>
                <td className="py-3 leading-normal text-pretty text-body">
                  {row.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
