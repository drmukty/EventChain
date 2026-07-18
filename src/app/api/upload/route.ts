import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_BYTES = 75000; // ✅ 75KB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// POST /api/upload
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "You must be logged in to upload images." },
      { status: 401 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const folder = (formData.get("folder") as string) || "misc";

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG and WEBP images are allowed." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image too large. Max ${MAX_BYTES / 1000}KB` }, // shows "Max 75KB"
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop() || file.type.split("/")[1] || "png";
  const path = `${folder}/${(session.user as any).id}-${Date.now()}.${extension}`;

  const { error } = await supabaseAdmin.storage
    .from("EventChain")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const { data } = supabaseAdmin.storage
    .from("EventChain")
    .getPublicUrl(path);

  return NextResponse.json({
    success: true,
    url: data.publicUrl,
    path,
  });
}
