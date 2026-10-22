import { NextResponse, type NextRequest } from "next/server";

/** Optimistic check only: send visitors without a session cookie to the sign-in page. Every API route and page still verifies the session itself. */
export function proxy(req: NextRequest) {
  if (!req.cookies.get("lw_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons|geo|.*\.(?:png|svg|jpg|ico|webp|json)$).*)"],
};
