import { NextResponse, type NextRequest } from "next/server";

const gateCookieName = "vs_admin_gate";
const queryKeyName = "k";

function shouldBypass(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/public")
  );
}

export function middleware(request: NextRequest) {
  const accessKey = process.env.ADMIN_ACCESS_KEY?.trim();

  // If key isn't configured, don't block (useful for local dev).
  if (!accessKey) {
    return NextResponse.next();
  }

  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const cookieKey = request.cookies.get(gateCookieName)?.value;
  if (cookieKey === accessKey) {
    return NextResponse.next();
  }

  const urlKey = nextUrl.searchParams.get(queryKeyName);
  if (urlKey && urlKey === accessKey) {
    const response = NextResponse.redirect(new URL(nextUrl.pathname, request.url));
    response.cookies.set({
      name: gateCookieName,
      value: accessKey,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  }

  // Hide the admin panel unless the user has the secret link.
  const notFoundUrl = new URL("/404", request.url);
  return NextResponse.rewrite(notFoundUrl);
}

export const config = {
  matcher: ["/:path*"],
};
