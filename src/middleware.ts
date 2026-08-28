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
    pathname === "/docupeer-favicon.ico" ||
    pathname === "/docupeer-icon-16.png" ||
    pathname === "/docupeer-icon-32.png" ||
    pathname === "/docupeer-icon-512.png" ||
    pathname === "/docupeer-logo.png" ||
    pathname === "/opengraph-image" ||
    pathname === "/twitter-image" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

function isStatusHost(host: string) {
  return host === STATUS_HOST;
}

function statusUrl() {
  const configured = process.env.NEXT_PUBLIC_STATUS_URL || `https://${STATUS_HOST}`;
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
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/status" ||
    pathname.startsWith("/api/status") ||
    pathname === "/live" ||
    pathname.startsWith("/api/live") ||
    pathname === "/admin" ||
    pathname.startsWith("/api/admin") ||
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
        return NextResponse.redirect(statusUrl());
      }
    }
  } catch {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|llms.txt).*)"],
};
