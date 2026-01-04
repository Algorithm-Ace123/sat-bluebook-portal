import { redirect } from "next/navigation";
import { supabaseServer } from "../lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();

    if (!data.user) redirect("/login");

    // If logged in, send to student dashboard (role routing happens there too)
    redirect("/student");
}
