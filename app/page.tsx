import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

async function getAllSeries() {
  const { data, error } = await supabase
    .from("series")
    .select("id, title, slug, description, autoplay_speed, cover_panel_id, created_at")
    .order("created_at", { ascending: false });

  if (error) return [];

  const series = data ?? [];

  return Promise.all(
    series.map(async (s) => {
      const { count } = await supabase
        .from("panels")
        .select("id", { count: "exact", head: true })
        .eq("series_id", s.id);

      let coverUrl: string | null = null;
      if (s.cover_panel_id) {
        const { data: panel } = await supabase
          .from("panels")
          .select("image_url")
          .eq("id", s.cover_panel_id)
          .single();
        coverUrl = panel?.image_url ?? null;
      } else {
        // Use first panel as cover if no cover set
        const { data: first } = await supabase
          .from("panels")
          .select("image_url")
          .eq("series_id", s.id)
          .order("display_order", { ascending: true })
          .limit(1)
          .single();
        coverUrl = first?.image_url ?? null;
      }

      return { ...s, coverUrl, panel_count: count ?? 0 };
    })
  );
}

export default async function HomePage() {
  const series = await getAllSeries();

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Comics
        </h1>
      </header>

      <div className="px-6 py-8">
        {series.length === 0 ? (
          <p className="text-gray-400 text-sm">No series published yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {series.map((s) => {
              const { coverUrl, panel_count: panelCount } = s;

              return (
                <Link
                  key={s.id}
                  href={`/${s.slug}`}
                  className="group block rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors"
                >
                  <div className="aspect-[3/4] bg-gray-50 relative overflow-hidden">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={s.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gray-200 text-4xl select-none">
                          ◻
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-3">
                    <h2 className="font-medium text-gray-900 text-sm leading-snug">
                      {s.title}
                    </h2>
                    <p className="text-gray-400 text-xs mt-1">
                      {panelCount} {panelCount === 1 ? "panel" : "panels"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
