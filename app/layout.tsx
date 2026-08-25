import type { Metadata } from "next"
import { Geist, Geist_Mono, Lora } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans-family" })

const fontSerif = Lora({ subsets: ["latin"], variable: "--font-serif-family" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  // The site's own name and pitch. Every page overrides both with its own,
  // built from the title it carries in the page list.
  title: "Launch Studio Labs",
  description: "Carefully made interface pieces for ambitious products.",
  metadataBase: new URL("https://labs.launchstudio.space"),
  openGraph: {
    title: "Launch Studio Labs",
    description: "Carefully made interface pieces for ambitious products.",
    url: "/",
    siteName: "Launch Studio Labs",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        fontSans.variable,
        fontSerif.variable,
        fontMono.variable
      )}
    >
      <body>
        {/*
          Dark mode is off at the root, not removed: the .dark block in
          globals.css and the provider below are intact. Drop forcedTheme to
          turn it back on.
        */}
        <ThemeProvider forcedTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
