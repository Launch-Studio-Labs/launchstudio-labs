import { Manrope } from "next/font/google"

/**
 * The studio site sets its tabs in Manrope, so the demos that copy those tabs
 * do too. It is also a variable font with a `wght` axis, which is what lets
 * the weight move smoothly between 500 and 700 instead of swapping files.
 *
 * Loaded here rather than in the root layout: only these demos use it.
 */
export const studioFont = Manrope({ subsets: ["latin"] })
