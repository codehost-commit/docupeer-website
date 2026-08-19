import { NextRequest, NextResponse } from "next/server";

const STATUS_HOST = "status.docupeer.org";

function hostname(req: NextRequest) {
  return req.headers.get("host")?.split(":")[0].toLowerCase() ?? "";
}

function isStaticPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/team") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon-16.png" ||
    pathname === "/favicon-32.png" ||
    pathname === "/app-icon.png" ||
    pathname === "/opengraph-image" ||
    pathname === "/twitter-image" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

function isStatusHost(host: string) {
  return host === STATUS_HOST || host.startsWith("status.localhost");
}

function statusUrl(req: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_STATUS_URL || `https://${STATUS_HOST}`;
  if (hostname(req).endsWith("localhost")) return `${req.nextUrl.origin}/status`;
  return configured.replace(/\/$/, "");
}

export async function middleware(req: NextRequest) {
  const host = hostname(req);
  const { pathname } = req.nextUrl;

  if (isStatusHost(host)) {
    if (pathname === "/" || pathname === "/status") {
      const url = req.nextUrl.clone();
      url.pathname = "/status";
      return NextResponse.rewrite(url);
    }

    if (pathname === "/manage" || pathname === "/status-manage") {
      const url = req.nextUrl.clone();
      url.pathname = "/status-manage";
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  if (
    pathname === "/status" ||
    pathname === "/status-manage" ||
    pathname.startsWith("/api/status") ||
    isStaticPath(pathname)
  ) {
    return NextResponse.next();
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const response = await fetch(new URL("/api/status/public", req.nextUrl.origin), {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data?.status?.maintenanceMode) {
        return NextResponse.redirect(statusUrl(req));
      }
    }
  } catch {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/dashboard|api/papers|api/reviews|llms.txt).*)"],
};
