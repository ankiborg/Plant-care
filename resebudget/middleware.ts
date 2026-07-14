import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken } from "@/lib/auth-token";

export async function middleware(req: NextRequest) {
  const pin = process.env.APP_PIN;
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const authorized = Boolean(pin) && cookie === (await authToken(pin!));

  if (authorized) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Allt utom login, auth-endpointen och statiska filer kräver PIN-cookien.
  matcher: [
    "/((?!_next/|login|api/auth|sw\\.js|manifest\\.webmanifest|icons/|icon\\.svg|favicon\\.ico).*)",
  ],
};
