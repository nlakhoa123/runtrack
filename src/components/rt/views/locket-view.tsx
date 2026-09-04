"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Plus, Copy, Check, LogOut, Camera, X, Loader2, Trash2, RefreshCw, UserPlus, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { db, uid, fileToCompressedDataUrl } from "@/lib/rt/db";
import { avatarGradient, AVATAR_COLORS } from "@/lib/rt/types";

interface GroupInfo {
  id: string;
  name: string;
  inviteCode: string;
  role: string;
  members: { id: string; name: string; email: string; avatarColor: string; role: string }[];
}

interface SharedStoryItem {
  id: string;
  caption: string;
  dataUrl: string;
  createdAt: string;
  author: { id: string; name: string; avatarColor: string };
  isMine: boolean;
}

export default function LocketView() {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [stories, setStories] = useState<SharedStoryItem[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewer, setViewer] = useState<{ idx: number } | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.groups) {
        setGroups(data.groups);
        if (data.groups.length > 0 && !selectedGroupId) {
          setSelectedGroupId(data.groups[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  const fetchStories = useCallback(async () => {
    if (!selectedGroupId) return;
    setStoriesLoading(true);
    try {
      const res = await fetch(`/api/groups/stories?groupId=${selectedGroupId}`);
      const data = await res.json();
      if (data.stories) setStories(data.stories);
    } catch (e) {
      console.error(e);
    } finally {
      setStoriesLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);
  useEffect(() => { if (selectedGroupId) fetchStories(); }, [selectedGroupId, fetchStories]);

  const selected = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Nhóm</h1>
          <p className="text-sm text-muted-foreground">Share story với bạn bè — kiểu Locket</p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setJoinOpen(true)}>
            <UserPlus className="h-4 w-4" /> Tham gia
          </Button>
          <Button size="sm" className="gap-1.5 grad-primary border-transparent text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Tạo nhóm
          </Button>
        </div>
      </div>

      {/* groups list */}
      {loading ? (
        <div className="h-32 animate-pulse rounded-3xl bg-muted" />
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl grad-primary text-white shadow-glow">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold">Chưa có nhóm nào</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Tạo nhóm, mời bạn bè bằng mã mời, và chia sẻ story chạy bộ với nhau.
          </p>
        </div>
      ) : (
        <>
          {/* group tabs */}
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={cn(
                  "shrink-0 rounded-2xl border px-3 py-2 text-left transition-colors",
                  selectedGroupId === g.id ? "border-transparent grad-primary text-white shadow-soft" : "border-border bg-card hover:bg-muted"
                )}
              >
                <p className="text-sm font-bold">{g.name}</p>
                <p className={cn("text-[10px]", selectedGroupId === g.id ? "text-white/80" : "text-muted-foreground")}>
                  {g.members.length} thành viên
                </p>
              </button>
            ))}
          </div>

          {/* selected group detail */}
          {selected && (
            <>
              {/* invite code */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Mã mời nhóm</p>
                  <p className="tnum text-2xl font-extrabold tracking-widest text-grad-primary">{selected.inviteCode}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    navigator.clipboard?.writeText(selected.inviteCode);
                    toast.success("Đã sao chép mã mời");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Sao chép
                </Button>
              </div>

              {/* members */}
              <div className="flex flex-wrap gap-2">
                {selected.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-2.5 py-1.5">
                    <div
                      className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundImage: avatarGradient(m.avatarColor) }}
                    >
                      {m.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs font-medium">{m.name}</span>
                    {m.role === "owner" && <span className="text-[9px] font-bold text-primary">OWNER</span>}
                  </div>
                ))}
              </div>

              {/* compose + refresh */}
              <div className="flex gap-2">
                <Button onClick={() => setComposeOpen(true)} className="flex-1 gap-2 grad-primary border-transparent text-white">
                  <Camera className="h-4 w-4" /> Chia sẻ khoảnh khắc
                </Button>
                <Button variant="outline" size="icon" onClick={fetchStories} aria-label="Làm mới">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* shared stories */}
              {storiesLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                </div>
              ) : stories.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
                  <Sparkles className="mb-2 h-8 w-8 text-primary" />
                  <p className="text-sm font-semibold">Chưa có story nào</p>
                  <p className="mt-1 text-xs text-muted-foreground">Chia sẻ khoảnh khắc chạy bộ đầu tiên với nhóm!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {stories.map((s, i) => (
                    <motion.button
                      key={s.id}
                      onClick={() => setViewer({ idx: i })}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: "-4% 0px" }}
                      transition={{ duration: 0.4, delay: (i % 6) * 0.04 }}
                      className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/60"
                    >
                      <img src={s.dataUrl} alt="story" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <div className="flex items-center gap-1.5">
                          <div className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-white" style={{ backgroundImage: avatarGradient(s.author.avatarColor) }}>
                            {s.author.name[0]?.toUpperCase()}
                          </div>
                          <span className="truncate text-[10px] font-medium text-white">{s.author.name}</span>
                        </div>
                        {s.caption && <p className="mt-0.5 line-clamp-2 text-[10px] text-white/80">{s.caption}</p>}
                      </div>
                      {s.isMine && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteStory(s.id, fetchStories); }}
                          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                          aria-label="Xoá"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* viewer */}
              <AnimatePresence>
                {viewer && stories[viewer.idx] && (
                  <LocketViewer stories={stories} startIdx={viewer.idx} onClose={() => setViewer(null)} onDelete={fetchStories} />
                )}
              </AnimatePresence>
            </>
          )}
        </>
      )}

      {/* modals */}
      <AnimatePresence>
        {createOpen && <CreateGroupModal onClose={() => setCreateOpen(false)} onCreated={(g) => { setGroups((prev) => [...prev, g]); setSelectedGroupId(g.id); setCreateOpen(false); }} />}
        {joinOpen && <JoinGroupModal onClose={() => setJoinOpen(false)} onJoined={(g) => { setGroups((prev) => [...prev, g]); setSelectedGroupId(g.id); setJoinOpen(false); }} />}
        {composeOpen && selected && (
          <ComposeModal groupId={selected.id} onClose={() => setComposeOpen(false)} onPosted={() => { setComposeOpen(false); fetchStories(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

async function deleteStory(storyId: string, refresh: () => void) {
  if (!confirm("Xoá story này?")) return;
  try {
    await fetch(`/api/groups/stories?storyId=${storyId}`, { method: "DELETE" });
    toast.success("Đã xoá story");
    refresh();
  } catch (e) {
    toast.error("Không xoá được");
  }
}

function LocketViewer({ stories, startIdx, onClose, onDelete }: { stories: SharedStoryItem[]; startIdx: number; onClose: () => void; onDelete: () => void; }) {
  const [idx, setIdx] = useState(startIdx);
  const current = stories[idx];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIdx((i) => Math.min(stories.length - 1, i + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stories.length, onClose]);

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black"
      onClick={onClose}
    >
      <motion.div
        key={current.id}
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative aspect-[3/4] h-full max-h-[90vh] overflow-hidden bg-black"
      >
        <img src={current.dataUrl} alt="story" className="h-full w-full object-cover" />
        <button onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60" aria-label="Đóng">
          <X className="h-5 w-5" />
        </button>
        {idx > 0 && <button onClick={() => setIdx(idx - 1)} className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50"><span className="text-xl">‹</span></button>}
        {idx < stories.length - 1 && <button onClick={() => setIdx(idx + 1)} className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50"><span className="text-xl">›</span></button>}
        <div className="pointer-events-none absolute inset-x-3 bottom-6">
          <div className="rounded-2xl bg-black/40 px-4 py-2.5 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundImage: avatarGradient(current.author.avatarColor) }}>
                {current.author.name[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-white">{current.author.name}</span>
            </div>
            {current.caption && <p className="mt-1 text-sm text-white/90">{current.caption}</p>}
          </div>
        </div>
        {current.isMine && (
          <button onClick={() => { deleteStory(current.id, onDelete); onClose(); }} className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60" aria-label="Xoá">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (g: GroupInfo) => void; }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await res.json();
      if (data.ok && data.group) {
        onCreated({ id: data.group.id, name: data.group.name, inviteCode: data.group.inviteCode, role: "owner", members: [] });
        toast.success("Đã tạo nhóm 🎉");
      }
    } catch (e) { toast.error("Không tạo được"); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell onClose={onClose} title="Tạo nhóm mới">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên nhóm (vd: Câu lạc bộ chạy A)" className="h-12" />
      <Button onClick={create} disabled={saving || !name.trim()} className="w-full gap-2 grad-primary border-transparent text-white">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tạo nhóm
      </Button>
    </ModalShell>
  );
}

function JoinGroupModal({ onClose, onJoined }: { onClose: () => void; onJoined: (g: GroupInfo) => void; }) {
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  async function join() {
    if (!code.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/groups/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await res.json();
      if (data.ok && data.group) {
        onJoined({ id: data.group.id, name: data.group.name, inviteCode: data.group.inviteCode, role: "member", members: [] });
        toast.success("Đã tham gia nhóm 🎉");
      } else {
        toast.error(data.error || "Không tham gia được");
      }
    } catch (e) { toast.error("Không tham gia được"); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell onClose={onClose} title="Tham gia nhóm">
      <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Mã mời (6 ký tự)" className="h-12 text-center text-lg font-bold tracking-widest" maxLength={6} />
      <Button onClick={join} disabled={saving || code.trim().length < 6} className="w-full gap-2 grad-primary border-transparent text-white">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Tham gia
      </Button>
    </ModalShell>
  );
}

function ComposeModal({ groupId, onClose, onPosted }: { groupId: string; onClose: () => void; onPosted: () => void; }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    try {
      const url = await fileToCompressedDataUrl(file, 1080, 0.8);
      setPreview(url);
    } catch (e) { toast.error("Không tải được ảnh"); }
    finally { setLoading(false); }
  }

  async function post() {
    if (!preview) return;
    setPosting(true);
    try {
      const res = await fetch("/api/groups/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, dataUrl: preview, caption }),
      });
      const data = await res.json();
      if (data.ok) { toast.success("Đã chia sẻ 🎉"); onPosted(); }
      else toast.error(data.error || "Không chia sẻ được");
    } catch (e) { toast.error("Không chia sẻ được"); }
    finally { setPosting(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-lift"
      >
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        {!preview ? (
          <button onClick={() => fileRef.current?.click()} className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 bg-muted/40 text-muted-foreground hover:bg-muted/60">
            {loading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <>
              <div className="grid h-16 w-16 place-items-center rounded-2xl grad-primary text-white shadow-glow"><Camera className="h-8 w-8" /></div>
              <p className="text-sm font-semibold">Chụp / chọn ảnh</p>
            </>}
          </button>
        ) : (
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
            <img src={preview} alt="story" className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Chú thích..." className="absolute inset-x-3 bottom-3 resize-none rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/60 backdrop-blur" rows={2} />
            <button onClick={() => fileRef.current?.click()} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60" aria-label="Đổi ảnh"><Camera className="h-4 w-4" /></button>
          </div>
        )}
        <button onClick={onClose} className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60" aria-label="Đóng"><X className="h-5 w-5" /></button>
        {preview && (
          <div className="p-3">
            <Button onClick={post} disabled={posting} className="w-full gap-2 grad-primary border-transparent text-white">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Chia sẻ với nhóm
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ModalShell({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode; }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-lift"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">{children}</div>
      </motion.div>
    </motion.div>
  );
}
