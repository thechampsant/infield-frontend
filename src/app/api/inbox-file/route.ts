import { NextRequest } from "next/server";

/**
 * Authenticated file proxy for inbox attachment images.
 *
 * The browser cannot attach an Authorization header to a plain <img> tag, and
 * sending one via fetch triggers a CORS preflight the file endpoint may not
 * support. This same-origin route injects the bearer token server-side and
 * streams the bytes back, avoiding CORS entirely.
 *
 * Usage: /api/inbox-file?path=<gcs path>&token=<bearer token>
 */

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://services.infield.co.in";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  const token = req.nextUrl.searchParams.get("token");

  if (!path) {
    return new Response("Missing path", { status: 400 });
  }

  const target = `${BACKEND_URL}/api/v1/gcs/file?path=${encodeURIComponent(path)}`;

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Forward the incoming cookie too, in case the backend uses cookie auth.
  const cookie = req.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;

  try {
    const upstream = await fetch(target, { headers });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new Response("Failed to fetch file", { status: 502 });
  }
}
