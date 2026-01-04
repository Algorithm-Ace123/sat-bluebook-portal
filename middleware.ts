import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const pathname = req.nextUrl.pathname;

    // Public paths
    const isPublic =
        pathname === "/login" ||
        pathname === "/" ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/api/auth/logout") ||
        pathname.startsWith("/api"); // don't block APIs; they validate auth themselves

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return req.cookies.get(name)?.value;
                },
                set(name: string, value: string, options?: any) {
                    res.cookies.set(name, value, options);
                },
                remove(name: string, options?: any) {
                    res.cookies.set(name, "", options);
                }
            }
        }
    );

    const { data } = await supabase.auth.getUser();
    const isAuthed = !!data.user;

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
