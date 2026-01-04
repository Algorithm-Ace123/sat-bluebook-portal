import { redirect } from "next/navigation";
import { supabaseServer } from "../lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
    let supabase;
    try {
        supabase = await supabaseServer();
    } catch (err) {
        console.error('Supabase init error in Home:', err);
        // Prevent an uncaught exception from crashing the page; redirect to login with an error flag
        redirect('/login?error=supabase_missing');
    }

    const { data } = await supabase.auth.getUser();

    if (!data.user) redirect("/login");

    // If logged in, send to student dashboard (role routing happens there too)
    redirect("/student");
} 
