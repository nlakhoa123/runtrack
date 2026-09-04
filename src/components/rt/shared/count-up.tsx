"use client";

import { animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CountUpProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
  whenInView?: boolean;
  format?: boolean;
}

export function CountUp({
  value,
  decimals = 0,
  duration = 1.1,
  className,
  suffix = "",
  prefix = "",
  whenInView = true,
  format = true,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const shouldRun = whenInView ? inView : true;
    if (!shouldRun) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration, inView, whenInView]);

  const text = format
    ? display.toLocaleString("vi-VN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : display.toFixed(decimals);

  return (
    <span ref={ref} className={cn("tnum", className)}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
