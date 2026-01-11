import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const pathname = req.nextUrl.pathname;

    // Public paths
    const isPublic =
        pathname === "/login" ||
        pathname === "/" ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/api") ||
        pathname.endsWith(".png") ||
        pathname.endsWith(".jpg") ||
        pathname.endsWith(".jpeg") ||
        pathname.endsWith(".svg") ||
        pathname.endsWith(".ico") ||
        pathname.endsWith(".pdf");

    // Check for auth cookies
    const authCookie =
        req.cookies.get("sb-access-token")?.value ??
        req.cookies.get("sb-refresh-token")?.value ??
        req.cookies.get("sb-session")?.value ??
        req.cookies.get("supabase-auth-token")?.value ??
        null;

    const isAuthed = !!authCookie;

    console.log(`[Middleware] Path: ${pathname}, isAuthed: ${isAuthed}, hasAccessToken: ${!!req.cookies.get("sb-access-token")}`);

    // If not authed and trying to access protected pages
    if (!isAuthed && !isPublic) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        // Use 303 See Other logic if it was a POST to avoid 405 on /login
        return NextResponse.redirect(url, { status: 303 });
    }

    // If authed and tries /login, push them to /student
    if (isAuthed && pathname === "/login") {
        const url = req.nextUrl.clone();
        url.pathname = "/student";
        return NextResponse.redirect(url, { status: 303 });
    }

    return res;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
