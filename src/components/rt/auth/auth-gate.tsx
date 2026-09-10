"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Footprints, Mail, Lock, User, Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AVATAR_COLORS } from "@/lib/rt/types";

export function AuthGate() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0].id);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      toast.error("Nhập email và mật khẩu");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, avatarColor }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Không đăng ký được");
          return;
        }
      }
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      console.log("signIn result:", result);
      if (result?.error) {
        toast.error("Email hoặc mật khẩu không đúng");
      } else if (result?.ok) {
        toast.success(mode === "login" ? "Đăng nhập thành công 🎉" : "Tài khoản đã tạo 🎉");
        // Small delay to let NextAuth set the cookie
        setTimeout(() => window.location.reload(), 300);
      } else {
        toast.error("Không thể đăng nhập. Thử lại.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full grad-primary opacity-20 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full grad-energy opacity-20 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-8">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="mb-6 h-20 w-20 overflow-hidden rounded-[2rem] shadow-glow"
        >
          <img src="/logo.png" alt="RunTrack" className="h-full w-full object-cover" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-extrabold tracking-tight text-center"
        >
          Run<span className="text-grad-primary">Track</span>
        </motion.h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Theo dõi chạy bộ &amp; cân nặng — nhật ký riêng của bạn
        </p>

        <div className="mt-6 flex w-full rounded-2xl border border-border bg-card p-1 shadow-soft">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "relative flex-1 rounded-xl py-2 text-sm font-bold transition-colors",
                mode === m ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === m && (
                <motion.span
                  layoutId="auth-tab"
                  className="absolute inset-0 rounded-xl grad-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">
                {m === "login" ? "Đăng nhập" : "Đăng ký"}
              </span>
            </button>
          ))}
        </div>

        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 w-full space-y-3"
        >
          {mode === "signup" && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên hiển thị"
                className="h-12 pl-10"
                maxLength={30}
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="h-12 pl-10"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu (tối thiểu 6 ký tự)"
              className="h-12 pl-10"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          {mode === "signup" && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Màu đại diện</p>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setAvatarColor(c.id)}
                    className={cn(
                      "aspect-square rounded-2xl transition-all",
                      avatarColor === c.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-105" : "hover:scale-105"
                    )}
                    style={{ backgroundImage: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                  />
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={submit}
            disabled={loading}
            className="h-12 w-full gap-2 grad-primary border-transparent text-white shadow-lift hover:opacity-90"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : mode === "login" ? (
              <><LogIn className="h-5 w-5" /> Đăng nhập</>
            ) : (
              <><UserPlus className="h-5 w-5" /> Tạo tài khoản</>
            )}
          </Button>
        </motion.div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          🔒 Dữ liệu chạy bộ &amp; cân nặng lưu riêng tư trên máy bạn.
        </p>
      </div>
    </div>
  );
}
