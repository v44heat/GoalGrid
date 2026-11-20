import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Confirms the app can reach Supabase and that the schema has been applied. */
export async function GET() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json(
      { ok: false, error: "Supabase environment variables are not set." },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const { count, error } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Could not read the teams table. Has the schema been applied?" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, teams: count ?? 0 });
}
