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
  return host === STATUS_HOST || host.startsWith("status.localhost");
}

function statusUrl(req: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_STATUS_URL || `https://${STATUS_HOST}`;
  if (hostname(req).endsWith("localhost")) return `${req.nextUrl.origin}/status`;
  return configured.replace(/\/$/, "");
}

function isLaunchProtectedPath(pathname: string) {
  return (
    pathname === "/register" ||
    pathname === "/review" ||
    pathname === "/submit" ||
    pathname === "/dashboard" ||
    pathname === "/history" ||
    pathname === "/api/auth/register" ||
    pathname === "/api/dashboard" ||
    pathname === "/api/papers" ||
    pathname.startsWith("/api/papers/") ||
    pathname === "/secretariat" ||
    pathname.startsWith("/api/secretariat") ||
    pathname === "/api/reviews" ||
    pathname.startsWith("/api/reviews/")
  );
}

function isProtectedApi(pathname: string) {
  return pathname.startsWith("/api/");
}

export async function middleware(req: NextRequest) {
  const host = hostname(req);
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/launch")) return NextResponse.next();

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
    (pathname.startsWith("/api/auth") && pathname !== "/api/auth/register") ||
    pathname === "/status" ||
    pathname === "/status-manage" ||
    pathname.startsWith("/api/status") ||
    pathname === "/live" ||
    pathname === "/live-manage" ||
    pathname.startsWith("/api/live") ||
    pathname === "/admin" ||
    pathname.startsWith("/api/admin") ||
    isStaticPath(pathname)
  ) {
    return NextResponse.next();
  }

  if (isLaunchProtectedPath(pathname)) {
    let isLaunched = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const response = await fetch(new URL("/api/launch/public", req.nextUrl.origin), {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        isLaunched = data?.launch?.isLaunched === true;
      }
    } catch {
      // Fail closed: product access should never precede the launch signal.
    }

    if (!isLaunched) {
      if (isProtectedApi(pathname)) {
        return NextResponse.json(
          { error: "DocuPeer is still in the launch countdown. Registration and product access are locked." },
          { status: 423 },
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "?launch=locked";
      return NextResponse.redirect(url);
    }
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
  matcher: ["/((?!_next/static|_next/image|llms.txt).*)"],
};
