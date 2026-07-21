import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Next.js 16 renombró "middleware" a "proxy" (siempre corre en Node.js,
// nunca Edge). Se usa `getToken` (decodifica el JWT de sesión
// directamente) en vez del wrapper `auth(handler)` de next-auth v5 beta:
// ese wrapper todavía no está probado contra el runtime `proxy` nuevo de
// Next 16 y, al validarlo con curl, `req.auth` no se poblaba aunque la
// cookie de sesión era válida (confirmado vía /api/auth/session). Esto
// es defensa en profundidad de todos modos: el guard real que nunca se
// salta es el de cada página (ver src/app/dashboard/page.tsx).
export default async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");

  if (isOnDashboard && !token) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
