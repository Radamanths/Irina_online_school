import { NextResponse } from "next/server";
import { getAppConfig } from "@virgo/config";

interface RouteParams {
  params: { courseId: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  const { courseId } = params;
  const { apiBaseUrl } = getAppConfig();

  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  if (!apiBaseUrl) {
    return NextResponse.json({ error: "API base URL is not configured" }, { status: 500 });
  }

  const incomingUrl = new URL(request.url);
  const format = (incomingUrl.searchParams.get("format") ?? "csv").toLowerCase();
  const locale = incomingUrl.searchParams.get("locale");

  const upstreamUrl = new URL(`/progress/export/course/${courseId}`, apiBaseUrl);
  upstreamUrl.searchParams.set("format", format);
  if (locale) {
    upstreamUrl.searchParams.set("locale", locale);
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, { cache: "no-store" });
    const body = await upstreamResponse.arrayBuffer();
    const headers = new Headers(upstreamResponse.headers);

    if (!headers.has("content-disposition") && format === "csv") {
      headers.set(
        "content-disposition",
        `attachment; filename=course-${courseId}-progress.csv`
      );
    }

    if (!headers.has("content-type")) {
      headers.set(
        "content-type",
        format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8"
      );
    }

    return new NextResponse(body, {
      status: upstreamResponse.status,
      headers
    });
  } catch (error) {
    console.error("Failed to export course progress", error);
    return NextResponse.json({ error: "Failed to export course progress" }, { status: 500 });
  }
}
