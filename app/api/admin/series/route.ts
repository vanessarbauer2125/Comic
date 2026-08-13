import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  if (!session || session.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { data: seriesList, error } = await supabase
    .from("series")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch panel counts separately
  const result = await Promise.all(
    (seriesList ?? []).map(async (s) => {
      const { count } = await supabase
        .from("panels")
        .select("id", { count: "exact", head: true })
        .eq("series_id", s.id);
      return { ...s, panel_count: count ?? 0 };
    })
  );

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { title, slug, description, autoplay_speed } = await request.json();

  if (!title || !slug) {
    return NextResponse.json(
      { error: "title and slug are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("series")
    .insert({
      title,
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      description: description || null,
      autoplay_speed: autoplay_speed ?? 3.5,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
