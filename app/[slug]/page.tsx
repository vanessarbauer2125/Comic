import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ComicReader from "./ComicReader";
import type { Panel } from "@/lib/supabase";

export const revalidate = 60;

async function getSeriesBySlug(slug: string) {
  const { data: series, error } = await supabase
    .from("series")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !series) return null;

  const { data: panels } = await supabase
    .from("panels")
    .select("*")
    .eq("series_id", series.id)
    .order("display_order", { ascending: true });

  return { ...series, panels: panels ?? [] };
}

export default async function ComicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ start?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const series = await getSeriesBySlug(slug);

  if (!series) notFound();

  const panels: Panel[] = series.panels ?? [];
  const startIndex = Math.min(
    Math.max(0, parseInt(sp.start ?? "0", 10) || 0),
    Math.max(0, panels.length - 1)
  );

  return (
    <ComicReader
      title={series.title}
      panels={panels}
      autospeed={series.autoplay_speed ?? 3.5}
      fadeDuration={series.fade_duration ?? 400}
      transitionType={series.transition_type ?? "fade-black"}
      zoomAmount={series.zoom_amount ?? 2.5}
      zoomOrigin={series.zoom_origin ?? "random"}
      bgColor={series.background_color ?? "#000000"}
      defaultPanelWidth={series.default_panel_width ?? 100}
      initialPanel={startIndex}
    />
  );
}
