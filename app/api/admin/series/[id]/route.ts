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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await params;

  const { data, error } = await supabase
    .from("series")
    .select(
      `
      *,
      cover_panel:panels!series_cover_panel_id_fkey(id, image_url),
      panels(*)
    `
    )
    .eq("id", id)
    .order("display_order", { referencedTable: "panels", ascending: true })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await params;
  const body = await request.json();
  const { title, slug, description, autoplay_speed, cover_panel_id, fade_duration, transition_type, zoom_amount, zoom_origin } = body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (slug !== undefined)
    updates.slug = slug.trim().toLowerCase().replace(/\s+/g, "-");
  if (description !== undefined) updates.description = description;
  if (autoplay_speed !== undefined) updates.autoplay_speed = autoplay_speed;
  if (cover_panel_id !== undefined) updates.cover_panel_id = cover_panel_id;
  if (fade_duration !== undefined) updates.fade_duration = fade_duration;
  if (transition_type !== undefined) updates.transition_type = transition_type;
  if (zoom_amount !== undefined) updates.zoom_amount = zoom_amount;
  if (zoom_origin !== undefined) updates.zoom_origin = zoom_origin;

  const { data, error } = await supabase
    .from("series")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await params;

  const { error } = await supabase.from("series").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
