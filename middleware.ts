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

    // Exhaustive cookie logging for Vercel debugging
    // Simplified check: Use the two cookies we now guarantee are set (SDK project cookie OR our raw access token)
    const allCookies = req.cookies.getAll();
    const cookieSummary = allCookies.map(c => `${c.name}=${c.name.includes('auth') ? '***' : c.value}`).join(', ');
    const supabaseCookie = allCookies.find(c => c.name.includes("-auth-token"));
    const legacyAccessToken = req.cookies.get("sb-access-token")?.value;

    console.log(`[Middleware] Request path: ${pathname}; public: ${isPublic}; cookies: ${cookieSummary}; supabaseCookie:${supabaseCookie?.name ?? 'none'}; legacyAccessToken:${!!legacyAccessToken}`);

    const isAuthed = !!(supabaseCookie || legacyAccessToken);

    // If not authed and trying to access protected pages
    if (!isAuthed && !isPublic) {
        console.log(`[Middleware] REDIRECT -> /login (Not Authed). Path: ${pathname}; cookies: ${cookieSummary}`);
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url, { status: 303 });
    }

    // If authed and tries /login, push them to the intended page or /student
    if (isAuthed && pathname === "/login") {
        const next = req.nextUrl.searchParams.get("next");
        console.log(`[Middleware] REDIRECT -> ${next || "/student"} (Already Authed). Path: ${pathname}; cookies: ${cookieSummary}`);
        const url = req.nextUrl.clone();

        if (next && next.startsWith("/") && next !== "/login") {
            url.pathname = next;
            url.searchParams.delete("next");
        } else {
            url.pathname = "/student";
        }

        console.log(`[Middleware] Final Redirect URL: ${url.href}`);
        return NextResponse.redirect(url, { status: 303 });
    }

    return res;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
