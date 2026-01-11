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
    const allCookies = req.cookies.getAll();
    const cookieNames = allCookies.map(c => c.name);
    const supabaseCookie = allCookies.find(c => c.name.includes("-auth-token"));
    const manualSDKCookie = req.cookies.get("supabase-auth-token")?.value;
    const legacyAccessToken = req.cookies.get("sb-access-token")?.value;
    const legacySession = req.cookies.get("sb-session")?.value;

    const isAuthed = !!(supabaseCookie || manualSDKCookie || legacyAccessToken || legacySession);

    console.log(`[Middleware] ${req.method} ${pathname}`);
    console.log(`[Middleware] Cookies found: ${cookieNames.join(", ") || "NONE"}`);
    console.log(`[Middleware] isAuthed: ${isAuthed} (SDK Cookie: ${!!supabaseCookie}, Legacy AT: ${!!legacyAccessToken}, Legacy Session: ${!!legacySession})`);

    // If not authed and trying to access protected pages
    if (!isAuthed && !isPublic) {
        console.log(`[Middleware] REDIRECT -> /login (Not Authed)`);
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url, { status: 303 });
    }

    // If authed and tries /login, push them to the intended page or /student
    if (isAuthed && pathname === "/login") {
        const next = req.nextUrl.searchParams.get("next");
        console.log(`[Middleware] REDIRECT -> ${next || "/student"} (Already Authed)`);
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
