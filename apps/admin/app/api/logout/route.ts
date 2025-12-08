import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set({ name: "vs_admin", value: "", expires: new Date(0), path: "/" });
  return response;
}
