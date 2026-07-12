import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Server-side route protection.
 *
 * Only these pages are publicly accessible: /, /about, /contact, /guide,
 * /login, /register (and their sub-paths), plus Next internals and static
 * assets. Everything else requires a valid session — unauthenticated
 * visitors are redirected to /login with a callbackUrl so they land back
 * where they started after signing in.
 *
 * This runs before any page component, so it also protects pages that
 * previously had no server-side guard at all (dashboard, events, scan,
 * nft-gallery, certificates, notifications, profile, analytics, team
 * management, my-events, etc.) — those pages were client components
 * ("use client") that only fetched data client-side, so their API calls
 * would 401 but the page shell itself rendered for anonymous visitors.
 */

const PUBLIC_PATHS = ["/", "/about", "/contact", "/guide", "/login", "/register"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Allow public event browsing (list + detail pages) per spec section 8 —
  // all events are PUBLIC now, so browsing doesn't require auth. Actions
  // like "Apply" still hit an authenticated API route.
  if (pathname === "/events" || pathname.startsWith("/events/")) return true;
  return false;
}

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (isPublicPath(req.nextUrl.pathname)) return true;
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes (they enforce their own auth via getServerSession)
     * - _next/static, _next/image (Next internals)
     * - static files (favicon, images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
