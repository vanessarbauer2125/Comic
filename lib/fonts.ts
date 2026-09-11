export const CAPTION_FONTS = [
  { label: "Default (Sans)",    value: "var(--font-geist-sans)" },
  { label: "Bangers",           value: "var(--font-bangers)" },
  { label: "Permanent Marker",  value: "var(--font-permanent-marker)" },
  { label: "Comic Neue",        value: "var(--font-comic-neue)" },
  { label: "Caveat",            value: "var(--font-caveat)" },
  { label: "Kalam",             value: "var(--font-kalam)" },
  { label: "Lora",              value: "var(--font-lora)" },
  { label: "Merriweather",      value: "var(--font-merriweather)" },
] as const;

export type CaptionFontValue = typeof CAPTION_FONTS[number]["value"];
