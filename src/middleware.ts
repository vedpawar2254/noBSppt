import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

// Routes that require authentication
const PROTECTED_PATHS = ["/dashboard", "/decks", "/create", "/upgrade", "/deck"];

// Auth routes — redirect to dashboard if already logged in
const AUTH_PATHS = ["/register", "/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected || isAuthRoute) {
    const session = await getSessionFromRequest(req);

    if (isProtected && !session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
