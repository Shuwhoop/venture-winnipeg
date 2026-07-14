import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  const diagnostics = {
    hasUrl: Boolean(url),
    urlLooksCorrect:
      url?.startsWith("https://") === true &&
      url?.includes(".supabase.co") === true,
    hasSecretKey: Boolean(secretKey),
    secretKeyLooksCorrect:
      secretKey?.startsWith("sb_secret_") === true
  };

  try {
    const supabase = getSupabaseAdminClient();

    const { count, error } = await supabase
      .from("places")
      .select("id", {
        count: "exact",
        head: true
      });

    if (error) {
      console.error("Supabase health error:", error);

      return NextResponse.json(
        {
          ok: false,
          diagnostics,
          supabaseError: {
            message: error.message || "(empty message)",
            code: error.code || "(empty code)",
            details: error.details || "(empty details)",
            hint: error.hint || "(empty hint)"
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Venture is connected to Supabase.",
      placesCount: count ?? 0
    });
  } catch (error) {
    console.error("Supabase health exception:", error);

    return NextResponse.json(
      {
        ok: false,
        diagnostics,
        caughtError:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message
              }
            : String(error)
      },
      { status: 500 }
    );
  }
}