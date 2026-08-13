import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SeriesEditor from "./SeriesEditor";

async function getSeries(id: string) {
  const { data: series, error: seriesError } = await supabase
    .from("series")
    .select("*")
    .eq("id", id)
    .single();

  if (seriesError || !series) return null;

  const { data: panels } = await supabase
    .from("panels")
    .select("*")
    .eq("series_id", id)
    .order("display_order", { ascending: true });

  return { ...series, panels: panels ?? [] };
}

export default async function SeriesAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await getSeries(id);

  if (!series) notFound();

  return <SeriesEditor series={series} />;
}
