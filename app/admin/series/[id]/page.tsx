import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SeriesEditor from "./SeriesEditor";

async function getSeries(id: string) {
  const { data, error } = await supabase
    .from("series")
    .select("*, panels(*)")
    .eq("id", id)
    .order("display_order", { referencedTable: "panels", ascending: true })
    .single();

  if (error) return null;
  return data;
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
