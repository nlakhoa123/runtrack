import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST: join a group by invite code
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const uid = (session.user as { id?: string }).id!;
  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ error: "Thiếu mã mời" }, { status: 400 });
  const group = await db.group.findUnique({ where: { inviteCode: code.trim().toUpperCase() } });
  if (!group) return NextResponse.json({ error: "Mã mời không đúng" }, { status: 404 });
  const existing = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: uid } },
  });
  if (existing) return NextResponse.json({ error: "Bạn đã ở trong nhóm này" }, { status: 409 });
  await db.groupMember.create({ data: { groupId: group.id, userId: uid, role: "member" } });
  return NextResponse.json({ ok: true, group });
}
