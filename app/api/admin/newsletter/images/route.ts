import { NextResponse } from "next/server";

import { getVentureAdmin } from "@/lib/auth/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp"
};

export async function POST(request: Request) {
  const admin = await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 401 }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Venture could not read that image upload." },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Choose an image to upload." },
      { status: 400 }
    );
  }

  const extension = EXTENSIONS[file.type];

  if (!extension) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, GIF, or WebP image." },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Keep newsletter images under 5 MB." },
      { status: 413 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const now = new Date();
  const path = `${now.getUTCFullYear()}/${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}/${crypto.randomUUID()}.${extension}`;

  const supabase = getSupabaseAdminClient();
  const upload = await supabase.storage
    .from("newsletter-images")
    .upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false
    });

  if (upload.error) {
    console.error("Newsletter image upload failed", upload.error);
    return NextResponse.json(
      { error: "Venture could not upload that image." },
      { status: 500 }
    );
  }

  const publicUrl = supabase.storage
    .from("newsletter-images")
    .getPublicUrl(path).data.publicUrl;

  return NextResponse.json({
    ok: true,
    url: publicUrl
  });
}
