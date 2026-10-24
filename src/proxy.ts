import { NextResponse, type NextRequest } from "next/server";

// URLs without a locale are English: /projects/x is served from /en/projects/x.
// /en/... redirects to the clean URL so every page has one canonical address.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Next emits share-image URLs with the internal /en prefix; crawlers often don't
  // follow redirects for those, so serve them as they are.
  if (pathname.endsWith("/opengraph-image")) return;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }
  // Spanish paths from before the site went bilingual.
  const legacy = pathname.match(/^\/(proyectos|bitacora)(\/.*)?$/);
  if (legacy) {
    const url = request.nextUrl.clone();
    url.pathname = `/es/${legacy[1] === "proyectos" ? "projects" : "journal"}${legacy[2] ?? ""}`;
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/es" || pathname.startsWith("/es/")) return;

  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Not for Next internals, the API-like routes or files with an extension.
  matcher: ["/((?!_next/|status$|healthz$|.*\\.[a-z0-9]+$).*)"],
};
