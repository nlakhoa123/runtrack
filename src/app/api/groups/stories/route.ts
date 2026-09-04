import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: fetch shared stories for a group (newest first, last 24h)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const uid = (session.user as { id?: string }).id!;
  const groupId = req.nextUrl.searchParams.get("groupId");
  if (!groupId) return NextResponse.json({ error: "Thiếu groupId" }, { status: 400 });
  // verify membership
  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: uid } },
  });
  if (!member) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const since = new Date(Date.now() - 48 * 3600 * 1000); // last 48h
  const stories = await db.sharedStory.findMany({
    where: { groupId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
  return NextResponse.json({
    stories: stories.map((s) => ({
      id: s.id,
      caption: s.caption,
      dataUrl: s.dataUrl,
      createdAt: s.createdAt.toISOString(),
      author: {
        id: s.user.id,
        name: s.user.name || s.user.email,
        avatarColor: s.user.avatarColor,
      },
      isMine: s.user.id === uid,
    })),
  });
}

// POST: post a new shared story
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const uid = (session.user as { id?: string }).id!;
  const { groupId, dataUrl, caption } = await req.json();
  if (!groupId || !dataUrl) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
  // verify membership
  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: uid } },
  });
  if (!member) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  // limit photo size (~1MB base64)
  if (dataUrl.length > 1_500_000) {
    return NextResponse.json({ error: "Ảnh quá lớn (tối đa ~1MB)" }, { status: 413 });
  }
  const story = await db.sharedStory.create({
    data: { groupId, userId: uid, dataUrl, caption: caption || "" },
  });
  return NextResponse.json({ ok: true, storyId: story.id });
}

// DELETE: delete own story
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const uid = (session.user as { id?: string }).id!;
  const storyId = req.nextUrl.searchParams.get("storyId");
  if (!storyId) return NextResponse.json({ error: "Thiếu storyId" }, { status: 400 });
  const story = await db.sharedStory.findUnique({ where: { id: storyId } });
  if (!story) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (story.userId !== uid) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  await db.sharedStory.delete({ where: { id: storyId } });
  return NextResponse.json({ ok: true });
}
