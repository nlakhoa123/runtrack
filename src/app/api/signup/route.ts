import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, avatarColor } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Thiếu email hoặc mật khẩu" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Mật khẩu tối thiểu 6 ký tự" }, { status: 400 });
    }
    const lower = email.toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email: lower } });
    if (existing) {
      return NextResponse.json({ error: "Email đã được đăng ký" }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        email: lower,
        name: name || null,
        passwordHash,
        avatarColor: avatarColor || "mint",
      },
    });
    return NextResponse.json({ ok: true, userId: user.id });
  } catch (e) {
    console.error("signup error:", e);
    return NextResponse.json({ error: "Không thể đăng ký" }, { status: 500 });
  }
}
