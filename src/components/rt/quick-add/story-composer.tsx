"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRtStore } from "@/store/rt-store";
import { db, uid, fileToCompressedDataUrl } from "@/lib/rt/db";
import { todayKey } from "@/lib/rt/dates";
import { toast } from "sonner";
import { Camera, X, Loader2, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StoryComposer() {
  const open = useRtStore((s) => s.storyComposerOpen);
  const setOpen = useRtStore((s) => s.setStoryComposerOpen);
  const activeProfileId = useRtStore((s) => s.activeProfileId);

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setCaption("");
      setSaving(false);
      setLoading(false);
    }
  }, [open]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 1080, 0.82);
      setPreview(dataUrl);
    } catch (e) {
      console.error(e);
      toast.error("Không tải được ảnh");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!activeProfileId || !preview) return;
    setSaving(true);
    try {
      await db.stories.put({
        id: uid(),
        profileId: activeProfileId,
        dataUrl: preview,
        caption: caption.trim(),
        date: todayKey(),
        createdAt: Date.now(),
      });
      setOpen(false);
      toast.success("Đã đăng story ✨");
    } catch (e) {
      console.error(e);
      toast.error("Không lưu được story");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-lift"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />

            {/* preview / placeholder */}
            {!preview ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/60"
              >
                {loading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <>
                    <div className="grid h-16 w-16 place-items-center rounded-2xl grad-primary text-white shadow-glow">
                      <Camera className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-semibold">Chụp / chọn ảnh</p>
                    <p className="text-xs text-muted-foreground">Khoảnh khắc chạy bộ của bạn</p>
                  </>
                )}
              </button>
            ) : (
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
                <img src={preview} alt="story" className="h-full w-full object-cover" />
                {/* gradient overlay for caption */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
                {/* caption input */}
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Viết chú thích..."
                  className="absolute inset-x-3 bottom-3 resize-none rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/60 backdrop-blur"
                  rows={2}
                />
                {/* change photo */}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
                  aria-label="Đổi ảnh"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>

            {/* save */}
            {preview && (
              <div className="p-3">
                <Button
                  onClick={save}
                  disabled={saving}
                  className="w-full gap-2 grad-primary border-transparent text-white hover:opacity-90"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Đăng story
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
