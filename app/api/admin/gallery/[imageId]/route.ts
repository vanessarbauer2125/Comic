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
  { params }: { params: Promise<{ imageId: string }> }
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { imageId } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;

  const { data, error } = await supabase
    .from("gallery_images")
    .update(updates)
    .eq("id", imageId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { imageId } = await params;

  const { data: image } = await supabase
    .from("gallery_images")
    .select("image_url")
    .eq("id", imageId)
    .single();

  if (image?.image_url) {
    const url = new URL(image.image_url);
    const pathParts = url.pathname.split("/storage/v1/object/public/panels/");
    if (pathParts[1]) {
      await supabase.storage.from("panels").remove([pathParts[1]]);
    }
  }

  const { error } = await supabase.from("gallery_images").delete().eq("id", imageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
