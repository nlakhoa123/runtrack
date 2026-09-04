import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// GET: list groups the user belongs to + members
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const uid = (session.user as { id?: string }).id!;
  const memberships = await db.groupMember.findMany({
    where: { userId: uid },
    include: { group: { include: { members: { include: { user: true } } } } },
  });
  const groups = memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    inviteCode: m.group.inviteCode,
    role: m.role,
    members: m.group.members.map((mem) => ({
      id: mem.user.id,
      name: mem.user.name || mem.user.email,
      email: mem.user.email,
      avatarColor: mem.user.avatarColor,
      role: mem.role,
    })),
  }));
  return NextResponse.json({ groups });
}

// POST: create a new group
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const uid = (session.user as { id?: string }).id!;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Thiếu tên nhóm" }, { status: 400 });
  const group = await db.group.create({
    data: {
      name: name.trim(),
      inviteCode: genCode(),
      members: {
        create: { userId: uid, role: "owner" },
      },
    },
  });
  return NextResponse.json({ ok: true, group });
}
