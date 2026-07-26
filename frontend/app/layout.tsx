import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const reading = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-reading",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Folio — Turn any PDF into a course",
  description: "Upload a PDF and get a structured, interactive learning course with an AI companion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${reading.variable} ${mono.variable}`}>
      <body className="font-display">{children}</body>
    </html>
  );
}
