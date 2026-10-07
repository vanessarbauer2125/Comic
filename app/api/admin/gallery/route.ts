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

  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { publicUrls } = await request.json() as { publicUrls: string[] };
  if (!publicUrls || publicUrls.length === 0) {
    return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("gallery_images")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);

  let nextOrder = (existing?.[0]?.display_order ?? -1) + 1;
  const results = [];
  const errors = [];

  for (const image_url of publicUrls) {
    const { data, error } = await supabase
      .from("gallery_images")
      .insert({ image_url, display_order: nextOrder++ })
      .select()
      .single();

    if (error) errors.push({ url: image_url, error: error.message });
    else results.push(data);
  }

  return NextResponse.json({ images: results, errors }, { status: 201 });
}
