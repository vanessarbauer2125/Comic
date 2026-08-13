import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ComicReader from "./ComicReader";
import type { Panel } from "@/lib/supabase";

export const revalidate = 60;

async function getSeriesBySlug(slug: string) {
  const { data, error } = await supabase
    .from("series")
    .select("*, panels(*)")
    .eq("slug", slug)
    .order("display_order", { referencedTable: "panels", ascending: true })
    .single();

  if (error) return null;
  return data;
}

export default async function ComicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);

  if (!series) notFound();

  const panels: Panel[] = series.panels ?? [];

  return (
    <ComicReader
      title={series.title}
      panels={panels}
      autospeed={series.autoplay_speed ?? 3.5}
    />
  );
}
