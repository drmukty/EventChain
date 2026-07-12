import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
// The client previously supplied `folder` as a free-text string that was
// concatenated directly into the storage path. That's client-controlled
// input feeding a path — even though Supabase Storage doesn't expose a
// traditional filesystem, there's no reason to accept an arbitrary string
// here. Restrict to a known allowlist instead.
const ALLOWED_FOLDERS = ["banners", "logos", "misc"];

// POST /api/upload — multipart/form-data with a single "file" field and a
// "folder" field (e.g. "banners" or "logos"). Returns the public URL.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ORGANIZER", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Only organizers can upload event media" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const requestedFolder = formData.get("folder") as string | null;
  const folder = ALLOWED_FOLDERS.includes(requestedFolder ?? "") ? (requestedFolder as string) : "misc";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, or WEBP images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split("/")[1];
  const path = `${folder}/${(session.user as any).id}-${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("eventchain")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabaseAdmin.storage.from("eventchain").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
