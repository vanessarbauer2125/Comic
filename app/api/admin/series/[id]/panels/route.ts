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
    .from("panels")
    .select("*")
    .eq("series_id", id)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await params;

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Get current max display_order for this series
  const { data: existing } = await supabase
    .from("panels")
    .select("display_order")
    .eq("series_id", id)
    .order("display_order", { ascending: false })
    .limit(1);

  let nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

  const results = [];
  const errors = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("panels")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      errors.push({ file: file.name, error: uploadError.message });
      continue;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("panels").getPublicUrl(filename);

    const { data: panel, error: dbError } = await supabase
      .from("panels")
      .insert({
        series_id: id,
        image_url: publicUrl,
        display_order: nextOrder++,
      })
      .select()
      .single();

    if (dbError) {
      errors.push({ file: file.name, error: dbError.message });
    } else {
      results.push(panel);
    }
  }

  return NextResponse.json({ panels: results, errors }, { status: 201 });
}
