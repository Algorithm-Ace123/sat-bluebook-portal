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

    // Avoid using Supabase client in middleware (Edge runtime incompatible).
    // Instead, check for common Supabase session cookie names. If one exists,
    // assume the user is authenticated and allow the request through.
    const authCookie =
        req.cookies.get("sb-access-token")?.value ??
        req.cookies.get("sb-refresh-token")?.value ??
        req.cookies.get("supabase-auth-token")?.value ??
        req.cookies.get("sb:token")?.value ??
        req.cookies.get("sb-session")?.value ??
        req.cookies.get("session")?.value ?? null;

    const isAuthed = !!authCookie;

    // If not authed and trying to access protected pages
    if (!isAuthed && !isPublic) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    // If authed and tries /login, push them to /student (role routing is inside pages)
    if (isAuthed && pathname === "/login") {
        const url = req.nextUrl.clone();
        url.pathname = "/student";
        return NextResponse.redirect(url);
    }

    return res;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
