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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; panelId: string }> }
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id, panelId } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.custom_width !== undefined) updates.custom_width = body.custom_width;
  if (body.custom_height !== undefined) updates.custom_height = body.custom_height;

  const { data, error } = await supabase
    .from("panels")
    .update(updates)
    .eq("id", panelId)
    .eq("series_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; panelId: string }> }
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id, panelId } = await params;

  // Get the panel to find its storage path
  const { data: panel, error: fetchError } = await supabase
    .from("panels")
    .select("*")
    .eq("id", panelId)
    .eq("series_id", id)
    .single();

  if (fetchError || !panel) {
    return NextResponse.json({ error: "Panel not found" }, { status: 404 });
  }

  // Extract storage path from the public URL
  const url = new URL(panel.image_url);
  // URL format: .../storage/v1/object/public/panels/<path>
  const pathParts = url.pathname.split("/storage/v1/object/public/panels/");
  const storagePath = pathParts[1];

  // Delete from storage if we can extract path
  if (storagePath) {
    await supabase.storage.from("panels").remove([storagePath]);
  }

  // Delete from DB
  const { error } = await supabase
    .from("panels")
    .delete()
    .eq("id", panelId)
    .eq("series_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
