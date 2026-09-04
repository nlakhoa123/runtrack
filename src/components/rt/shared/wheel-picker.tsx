"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface WheelPickerProps {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  itemHeight?: number;
  visible?: number;
  className?: string;
  format?: (v: number) => string;
  suffix?: string;
}

/** iOS-style vertical wheel number picker.
 *  Snap is driven synchronously by `value` (source of truth) via useLayoutEffect,
 *  and a settling guard prevents spurious onChange during programmatic snaps. */
export function WheelPicker({
  values,
  value,
  onChange,
  itemHeight = 40,
  visible = 5,
  className,
  format = (v) => v.toString(),
  suffix,
}: WheelPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const snap = itemHeight;
  const pad = Math.floor(visible / 2);
  const idx = Math.max(0, Math.min(values.length - 1, values.indexOf(value)));
  const [scrolling, setScrolling] = useState(false);
  const settlingRef = useRef(false);
  const rafRef = useRef<number>(0);
  const endTimer = useRef<number>(0);

  // Synchronous snap whenever the value-derived index changes — runs before paint.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = idx * snap;
    if (Math.abs(el.scrollTop - target) > 0.5) {
      settlingRef.current = true;
      el.scrollTop = target;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        settlingRef.current = false;
      });
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [idx, snap]);

  function commit() {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / snap);
    const clamped = Math.max(0, Math.min(values.length - 1, i));
    const target = clamped * snap;
    if (Math.abs(el.scrollTop - target) > 0.5) {
      settlingRef.current = true;
      el.scrollTo({ top: target, behavior: "smooth" });
      requestAnimationFrame(() => {
        settlingRef.current = false;
      });
    }
    if (values[clamped] !== value) onChange(values[clamped]);
    setScrolling(false);
  }

  function handleScroll() {
    if (settlingRef.current) return; // ignore programmatic snaps
    setScrolling(true);
    window.clearTimeout(endTimer.current);
    endTimer.current = window.setTimeout(commit, 100);
  }

  return (
    <div className={cn("relative select-none", className)} style={{ height: visible * itemHeight }}>
      {/* center selection indicator */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 rounded-2xl border-y border-primary/30 bg-primary/5"
        style={{ top: pad * itemHeight, height: itemHeight }}
      />
      {/* fade masks */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1/2 bg-gradient-to-b from-card to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-card to-transparent" />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto"
        style={{ paddingTop: pad * itemHeight, paddingBottom: pad * itemHeight }}
      >
        {values.map((v, i) => {
          const dist = Math.abs(i - idx);
          const opacity = scrolling ? Math.max(0.25, 1 - dist * 0.18) : dist === 0 ? 1 : Math.max(0.3, 1 - dist * 0.22);
          const scale = dist === 0 ? 1 : Math.max(0.82, 1 - dist * 0.06);
          return (
            <div
              key={v}
              className="grid snap-center place-items-center"
              style={{ height: itemHeight, opacity, transform: `scale(${scale})`, transition: scrolling ? "none" : "all 0.15s" }}
            >
              <span className={cn("tnum font-bold tabular-nums", dist === 0 ? "text-2xl text-foreground" : "text-lg text-muted-foreground")}>
                {format(v)}{suffix && <span className="ml-1 text-xs font-medium opacity-70">{suffix}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
