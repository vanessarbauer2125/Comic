import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin/dashboard and /admin/series/* routes
  const isProtected =
    pathname.startsWith("/admin/dashboard") ||
    pathname.startsWith("/admin/series");

  if (isProtected) {
    const session = request.cookies.get("admin_session");
    if (!session || session.value !== "1") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard", "/admin/dashboard/:path*", "/admin/series/:path*"],
};
