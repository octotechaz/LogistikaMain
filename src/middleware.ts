import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/jwt";
import { hostPolicyResult, isAdminPath, isDelegatedToExpress } from "@/lib/hostPolicy";

type MiddlewareRole = "CARRIER" | "CARGO_OWNER" | "DRIVER" | "DISPATCHER" | "OPERATOR" | "ADMIN";
const authCookieName = "azlog_token";

/**
 * Protected Next.js routes — portal user surfaces only.
 *
 * NOTE: Express routes (/dashboard/*, /octo-admin/*, /uploads/*) are handled
 * entirely by Express and never reach this auth check. Do NOT list them here.
 *
 * ADMIN is intentionally omitted: admins may only use Express octo-admin.
 */
const protectedRoutes: Array<{ prefix: string; roles: MiddlewareRole[] }> = [
  { prefix: "/carrier",            roles: ["CARRIER"] },
  { prefix: "/cargo-owner",        roles: ["CARGO_OWNER"] },
  { prefix: "/driver/profile",     roles: ["DRIVER"] },
  { prefix: "/dispatcher/profile", roles: ["DISPATCHER"] },
  { prefix: "/operator",           roles: ["OPERATOR"] },
];

// Routes reachable without authentication (exact match)
const publicRoutes = [
  "/operator/login",
  "/driver/register",
  "/driver/success",
  "/dispatcher/register",
  "/dispatcher/success",
  "/cargo-owner/register",
];

function dashboardPathForRole(role: MiddlewareRole): string {
  if (role === "CARRIER")     return "/carrier/dashboard";
  if (role === "DRIVER")      return "/driver/profile";
  if (role === "CARGO_OWNER") return "/cargo-owner/dashboard";
  if (role === "DISPATCHER")  return "/dispatcher/profile";
  if (role === "OPERATOR")    return "/operator/dashboard";
  return "/octo-admin";
}

/** Paths an ADMIN JWT may access outside Express (logout + Next admin APIs). */
function isAdminAllowedPath(pathname: string): boolean {
  if (isDelegatedToExpress(pathname)) return true;
  if (pathname === "/api/auth/logout") return true;
  if (isAdminPath(pathname)) return true;
  return false;
}

/** Segment-boundary-safe prefix match. */
function segmentStartsWith(pathname: string, prefix: string): boolean {
  return pathname === prefix ||
    pathname.startsWith(prefix + "/") ||
    pathname.startsWith(prefix + "?");
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const pathWithQuery = pathname + search;
  const incomingHost = request.headers.get("host") ?? "";
  const method = request.method.toUpperCase();

  // Determine whether this is a browser HTML page navigation.
  const acceptHeader = request.headers.get("accept") ?? "";
  const isHtmlRequest =
    (method === "GET" || method === "HEAD") &&
    acceptHeader.includes("text/html");

  // Host-policy check (runs before auth).
  // Express-delegated paths (/dashboard/*, /octo-admin/*, /uploads/*) always
  // return "pass" from hostPolicyResult — they are never redirected here.
  const policy = hostPolicyResult(pathWithQuery, incomingHost, process.env, {
    method,
    isHtmlRequest,
  });

  if (policy.action === "block404") {
    return new NextResponse(null, { status: 404 });
  }
  if (policy.action === "redirect") {
    return NextResponse.redirect(policy.location);
  }

  // ADMIN confinement: only octo-admin / dashboard / uploads (+ logout / api/admin).
  // Homepage, portal, and marketing pages redirect back into octo-admin.
  const token = request.cookies.get(authCookieName)?.value;
  if (token) {
    try {
      const payload = await verifyAuthToken(token);
      if (payload.role === "ADMIN" && !isAdminAllowedPath(pathname)) {
        return NextResponse.redirect(new URL("/octo-admin", request.url));
      }
    } catch {
      // Invalid token — fall through to normal auth handling.
    }
  }

  // Public routes bypass auth
  if (publicRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Find the most specific matching protected route (segment-boundary safe)
  const matchedRoute = protectedRoutes
    .filter((route) => segmentStartsWith(pathname, route.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  if (!matchedRoute) {
    return NextResponse.next();
  }

  if (!token) {
    const loginPath = pathname.startsWith("/operator") ? "/operator/login" : "/login";
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = await verifyAuthToken(token);

    if (!matchedRoute.roles.includes(payload.role)) {
      return NextResponse.redirect(
        new URL(dashboardPathForRole(payload.role), request.url)
      );
    }

    return NextResponse.next();
  } catch {
    const loginPath = pathname.startsWith("/operator") ? "/operator/login" : "/login";
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    // Portal user surfaces (Next.js pages)
    "/carrier/:path*",
    "/cargo-owner/:path*",
    "/driver/:path*",
    "/dispatcher/:path*",
    "/operator/:path*",
    // Next.js API routes (admin and user APIs)
    "/api/:path*",
    // Public marketing pages — catch-all excluding Next.js internals and statics
    // so host-policy redirects fire for public pages on wrong hosts.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)).*)",
  ],
};
