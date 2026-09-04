"use client";

import { motion } from "framer-motion";
import { avatarGradient } from "@/lib/rt/types";
import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  colorId: string;
  name: string;
  size?: number;
  className?: string;
  ring?: boolean;
  /** show check mark for selected */
  selected?: boolean;
}

export function ProfileAvatar({
  colorId,
  name,
  size = 48,
  className,
  ring = false,
  selected = false,
}: ProfileAvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className={cn("relative grid place-items-center rounded-2xl font-bold text-white shadow-soft", ring && "ring-2 ring-background", className)}
      style={{
        width: size,
        height: size,
        backgroundImage: avatarGradient(colorId),
        fontSize: size * 0.38,
      }}
    >
      <span className="drop-shadow-sm">{initials || "•"}</span>
      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-1 -bottom-1 grid place-items-center rounded-full bg-background shadow-soft"
          style={{ width: size * 0.34, height: size * 0.34 }}
        >
          <span className="grid place-items-center rounded-full bg-primary text-primary-foreground" style={{ width: size * 0.26, height: size * 0.26 }}>
            <svg viewBox="0 0 24 24" className="w-[60%] h-[60%]" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
        </motion.span>
      )}
    </div>
  );
}
