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

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const { files } = await request.json() as { files: { name: string }[] };

  const results = await Promise.all(
    files.map(async (file) => {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("panels")
        .createSignedUploadUrl(path);

      if (error) return { error: error.message };

      const { data: { publicUrl } } = supabase.storage.from("panels").getPublicUrl(path);
      return { signedUrl: data.signedUrl, path, publicUrl };
    })
  );

  return NextResponse.json({ results });
}
