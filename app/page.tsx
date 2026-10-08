import Link from "next/link";
import { supabase } from "@/lib/supabase";
import HomeFeed from "./HomeFeed";

export const revalidate = 60;

export default async function HomePage() {
  // Fetch gallery images and series in parallel
  const [{ data: galleryData }, { data: seriesData }] = await Promise.all([
    supabase.from("gallery_images").select("*").order("created_at", { ascending: false }),
    supabase.from("series").select("id, title, slug, cover_panel_id, created_at").order("created_at", { ascending: false }),
  ]);

  const images = (galleryData ?? []).map((img) => ({
    type: "image" as const,
    id: img.id,
    image_url: img.image_url,
    title: img.title,
    created_at: img.created_at,
  }));

  const seriesWithCovers = await Promise.all(
    (seriesData ?? []).map(async (s) => {
      const { count } = await supabase
        .from("panels")
        .select("id", { count: "exact", head: true })
        .eq("series_id", s.id);

      let coverUrl: string | null = null;
      if (s.cover_panel_id) {
        const { data: panel } = await supabase.from("panels").select("image_url").eq("id", s.cover_panel_id).single();
        coverUrl = panel?.image_url ?? null;
      } else {
        const { data: first } = await supabase.from("panels").select("image_url").eq("series_id", s.id).order("display_order", { ascending: true }).limit(1).single();
        coverUrl = first?.image_url ?? null;
      }

      return {
        type: "comic" as const,
        id: s.id,
        slug: s.slug,
        title: s.title,
        coverUrl,
        panel_count: count ?? 0,
        created_at: s.created_at,
      };
    })
  );

  // Merge and sort by newest first
  const items = [...images, ...seriesWithCovers].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-5 flex items-center justify-between">
        <h1 className="text-2xl text-gray-900" style={{ fontFamily: "Chalkduster, fantasy" }}>nessydoodle</h1>
        <Link href="/admin" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">Admin</Link>
      </header>

      <div className="px-6 py-8">
        <HomeFeed items={items} />
      </div>
    </main>
  );
}
