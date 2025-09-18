import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./lib/auth";
import { Role } from "@prisma/client";

export const config = {
  matcher: ["/api/:path*"],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  const publicApiPaths = ["/api/auth/register", "/api/auth/login", "/api/auth/refresh"];

  const isApiRoute = pathname.startsWith("/api/");

  if (publicApiPaths.some((path) => pathname.startsWith(path))) {
    return res;
  }

  let token: string | null = null;

  if (isApiRoute) {
    const authHeader = req.headers.get("authorization");
    token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  }

  const decoded = token ? await verifyAccessToken(token) : null;

  if (isApiRoute) {
    if (!decoded) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    res.headers.set("x-user-id", decoded.userId);
    res.headers.set("x-user-email", decoded.email);
    res.headers.set("x-user-role", decoded.role);

    if (pathname.startsWith("/api/admin") && decoded.role !== Role.Admin) {
      return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
    }
    if (pathname.startsWith("/api/organizer") && ![Role.Admin as Role, Role.Organizer as Role].includes(decoded.role)) {
      return NextResponse.json({ message: "Forbidden: Organizer or Admin access required" }, { status: 403 });
    }
  }

  return res;
}
