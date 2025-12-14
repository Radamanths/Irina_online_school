import { NextResponse } from "next/server";

function buildCookie() {
  return {
    name: "vs_admin",
    value: "demo-admin-token",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/"
  };
}

export async function POST(request: Request) {
  const data = await request.formData();
  const email = data.get("email")?.toString();
  const password = data.get("password")?.toString();

  if (!email || !password) {
    return NextResponse.redirect(new URL("/login?error=missing", request.url));
  }

  const expectedEmail = process.env.ADMIN_LOGIN_EMAIL?.trim();
  const expectedPassword = process.env.ADMIN_LOGIN_PASSWORD;
  if (expectedEmail && expectedPassword) {
    if (email.trim().toLowerCase() !== expectedEmail.toLowerCase() || password !== expectedPassword) {
      return NextResponse.redirect(new URL("/login?error=invalid", request.url));
    }
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(buildCookie());
  return response;
}
