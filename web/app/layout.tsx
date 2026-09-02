import type { Metadata } from "next";
import { UnifrakturCook, Abril_Fatface, Oswald, Old_Standard_TT } from "next/font/google";
import "./globals.css";

const masthead = UnifrakturCook({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-masthead",
  display: "swap",
});

const display = Abril_Fatface({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const condensed = Oswald({
  subsets: ["latin"],
  variable: "--font-condensed",
  display: "swap",
});

const serif = Old_Standard_TT({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Signalyze — The fine print, read for you",
  description: "AI document intelligence: obligations, terms, and risks, filed in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${masthead.variable} ${display.variable} ${condensed.variable} ${serif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}