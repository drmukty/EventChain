import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, WEBP allowed" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "png";
  const path = `avatars/${userId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("EventChain")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("EventChain")
    .getPublicUrl(path);

  const oldUser = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  if (oldUser?.avatarUrl) {
    const oldPath = oldUser.avatarUrl.split("/").pop();
    if (oldPath) {
      await supabaseAdmin.storage.from("EventChain").remove([`avatars/${oldPath}`]).catch(() => {});
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: publicUrlData.publicUrl },
  });

  return NextResponse.json({ url: publicUrlData.publicUrl });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });

  if (user?.avatarUrl) {
    const path = user.avatarUrl.split("/").pop();
    if (path) {
      await supabaseAdmin.storage.from("EventChain").remove([`avatars/${path}`]).catch(() => {});
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ success: true });
}
