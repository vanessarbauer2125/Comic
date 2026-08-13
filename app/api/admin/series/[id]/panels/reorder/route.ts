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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { id } = await params;
  const { orderedIds } = await request.json();

  if (!Array.isArray(orderedIds)) {
    return NextResponse.json(
      { error: "orderedIds must be an array" },
      { status: 400 }
    );
  }

  // Update each panel's display_order based on its position in orderedIds
  const updates = orderedIds.map((panelId: string, index: number) =>
    supabase
      .from("panels")
      .update({ display_order: index })
      .eq("id", panelId)
      .eq("series_id", id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error).map((r) => r.error?.message);

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Some updates failed", details: errors },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
