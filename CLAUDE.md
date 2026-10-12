@AGENTS.md

# Project: nessydoodle

Personal art + comics hosting site. Deploy by pushing to `main` on GitHub (auto-deploys to Vercel).

## Stack
- Next.js App Router, TypeScript, Tailwind
- Supabase — Postgres + Storage bucket `panels` for images
- Vercel (GitHub integration)

## Routes
- `/` — unified feed of gallery images + comics, sorted newest first, filterable by type (`app/page.tsx` + `app/HomeFeed.tsx`)
- `/comics` — comics-only listing (`app/comics/page.tsx`)
- `/gallery` — gallery-only listing (`app/gallery/page.tsx`)
- `/[slug]` — comic reader (`app/[slug]/ComicReader.tsx`)
- `/admin` — admin dashboard; no link on public-facing pages

## Database tables
- `series` — id, title, slug, description, cover_panel_id, autoplay_speed, fade_duration, transition_type, zoom_amount, zoom_origin, background_color, default_panel_width
- `panels` — id, series_id, image_url, display_order, custom_width, custom_height, caption, caption_position, caption_font_size, caption_font_family, caption_color
- `gallery_images` — id, image_url, title, created_at

To add DB columns: run SQL in the Supabase dashboard.

## Key files
- `app/page.tsx` — homepage server component, fetches + merges gallery+comics
- `app/HomeFeed.tsx` — client component, filterable unified feed
- `app/[slug]/ComicReader.tsx` — client-side reader (autoplay, transitions, captions)
- `app/admin/series/[id]/SeriesEditor.tsx` — admin panel editor (drag reorder, upload, caption editing)
- `app/api/admin/series/[id]/panels/[panelId]/route.ts` — PUT/DELETE API for panels
- `lib/supabase.ts` — Supabase client + TypeScript types
- `lib/fonts.ts` — CAPTION_FONTS list for font picker

## Panel captions
Captions support: text, position (top/bottom/left/right), font size, font family, color (`caption_color`). Color picker + hex input in admin UI.

## Dev docs
Live at `/admin/docs` (requires admin login). Covers tech stack, deployment, all routes, API, DB schema, and storage layout. Source: `app/admin/docs/page.tsx`.

## Branding
Header: "nessydoodle" in Chalkduster font, centered. No Portfolio label, no public Admin link.
