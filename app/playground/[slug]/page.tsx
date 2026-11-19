import { notFound } from "next/navigation"

import { demos, getDemo } from "@/components/demos/registry"

export function generateStaticParams() {
  return demos.map((demo) => ({ slug: demo.id }))
}

/** Unknown slugs 404 at build time, which a static export requires. */
export const dynamicParams = false

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const demo = getDemo(slug)

  if (!demo) {
    notFound()
  }

  const Demo = demo.component

  return <Demo />
}
