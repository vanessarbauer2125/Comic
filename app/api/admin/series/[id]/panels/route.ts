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

  const body = await request.json() as { publicUrls?: string[]; captionOnly?: boolean };

  // Get current max display_order for this series
  const { data: existing } = await supabase
    .from("panels")
    .select("display_order")
    .eq("series_id", id)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

  // Caption-only panel (no image)
  if (body.captionOnly) {
    const { data: panel, error } = await supabase
      .from("panels")
      .insert({ series_id: id, image_url: null, display_order: nextOrder })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ panel }, { status: 201 });
  }

  // Image panels
  const { publicUrls } = body;
  if (!publicUrls || publicUrls.length === 0) {
    return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
  }

  let order = nextOrder;
  const results = [];
  const errors = [];

  for (const publicUrl of publicUrls) {
    const { data: panel, error: dbError } = await supabase
      .from("panels")
      .insert({
        series_id: id,
        image_url: publicUrl,
        display_order: order++,
      })
      .select()
      .single();

    if (dbError) {
      errors.push({ url: publicUrl, error: dbError.message });
    } else {
      results.push(panel);
    }
  }

  return NextResponse.json({ panels: results, errors }, { status: 201 });
}
