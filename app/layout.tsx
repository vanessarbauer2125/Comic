import type { Metadata } from "next";
import { Geist, Geist_Mono, Bangers, Permanent_Marker, Comic_Neue, Caveat, Kalam, Lora, Merriweather } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Caption fonts — display: optional means they won't block render or cause FOUT;
// they only show if already cached, otherwise the fallback is used silently.
const bangers = Bangers({ variable: "--font-bangers", subsets: ["latin"], weight: "400", display: "optional" });
const permanentMarker = Permanent_Marker({ variable: "--font-permanent-marker", subsets: ["latin"], weight: "400", display: "optional" });
const comicNeue = Comic_Neue({ variable: "--font-comic-neue", subsets: ["latin"], weight: ["400", "700"], display: "optional" });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], display: "optional" });
const kalam = Kalam({ variable: "--font-kalam", subsets: ["latin"], weight: ["400", "700"], display: "optional" });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], display: "optional" });
const merriweather = Merriweather({ variable: "--font-merriweather", subsets: ["latin"], weight: ["400", "700"], display: "optional" });

export const metadata: Metadata = {
  title: "Comics",
  description: "A minimal comic hosting site",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bangers.variable} ${permanentMarker.variable} ${comicNeue.variable} ${caveat.variable} ${kalam.variable} ${lora.variable} ${merriweather.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
