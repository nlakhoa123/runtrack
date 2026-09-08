"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import {
  Check,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  Footprints,
  Info,
  Keyboard,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Ruler,
  Scale,
  Sun,
  Trash2,
  Trophy,
  Upload,
  User,
  LogIn,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/rt/db";
import type { Profile } from "@/lib/rt/types";
import { useRtStore } from "@/store/rt-store";
import {
  downloadJson,
  downloadText,
  exportAll,
  exportRunsCsv,
  exportWeightsCsv,
  estimateStorage,
  importBundle,
  prettySize,
  type ExportBundle,
} from "@/lib/rt/exportImport";
import {
  displayWeight,
  distanceLabel,
  fmtNum,
  round,
  weightLabel,
} from "@/lib/rt/utils";

import { ProfileAvatar } from "@/components/rt/shared/profile-avatar";
import { SectionCard } from "@/components/rt/shared/section-card";
import { ProfileForm } from "@/components/rt/onboarding/profile-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type ThemeChoice = "light" | "dark" | "system";
type UnitChoice = "metric" | "imperial";

interface SegOption<T extends string> {
  id: T;
  label: string;
  sub?: string;
  icon?: React.ReactNode;
}

export default function SettingsView() {
  const activeProfileId = useRtStore((s) => s.activeProfileId);
  const unitSystem = useRtStore((s) => s.unitSystem);
  const setUnitSystem = useRtStore((s) => s.setUnitSystem);
  const setActiveProfile = useRtStore((s) => s.setActiveProfile);
  const { theme, setTheme } = useTheme();

  const profile = useLiveQuery<Profile | undefined>(
    async () => (activeProfileId ? await db.profiles.get(activeProfileId) : undefined),
    [activeProfileId]
  );

  const counts = useLiveQuery<
    { profiles: number; runs: number; weights: number; achievements: number } | undefined
  >(
    async () => {
      const [profiles, runs, weights, achievements] = await Promise.all([
        db.profiles.count(),
        db.runs.count(),
        db.weights.count(),
        db.achievements.count(),
      ]);
      return { profiles, runs, weights, achievements };
    },
    []
  );

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingBundle, setPendingBundle] = useState<ExportBundle | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportSize, setExportSize] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const wUnit = weightLabel(unitSystem);
  const dUnit = distanceLabel(unitSystem);

  // Resolve the active theme choice. Falls back to "system" while next-themes
  // hydrates — both server and client first render "system", so no mismatch.
  const activeTheme: ThemeChoice = (theme as ThemeChoice | undefined) ?? "system";

  async function handleExport() {
    setExporting(true);
    try {
      const bundle = await exportAll();
      const json = JSON.stringify(bundle, null, 2);
      const bytes = new Blob([json]).size;
      setExportSize(bytes);
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
        d.getDate()
      ).padStart(2, "0")}`;
      downloadJson(`runtrack-backup-${stamp}.json`, bundle);
      toast.success("Đã xuất dữ liệu", {
        description: `${prettySize(bytes)} · ${bundle.profiles.length} hồ sơ · ${bundle.runs.length} chạy`,
      });
    } catch (e) {
      console.error(e);
      toast.error("Không xuất được dữ liệu");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportRunsCsv() {
    setExporting(true);
    try {
      const csv = await exportRunsCsv();
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      downloadText(`runtrack-runs-${stamp}.csv`, csv);
      toast.success("Đã xuất CSV buổi chạy", {
        description: `${csv.split("\n").length - 1} dòng · mở được bằng Excel/Google Sheets`,
      });
    } catch (e) {
      console.error(e);
      toast.error("Không xuất được CSV");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportWeightsCsv() {
    setExporting(true);
    try {
      const csv = await exportWeightsCsv();
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      downloadText(`runtrack-weights-${stamp}.csv`, csv);
      toast.success("Đã xuất CSV cân nặng", {
        description: `${csv.split("\n").length - 1} dòng · mở được bằng Excel/Google Sheets`,
      });
    } catch (e) {
      console.error(e);
      toast.error("Không xuất được CSV");
    } finally {
      setExporting(false);
    }
  }

  function handlePickFile() {
    fileRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // reset so picking the same file again still fires change
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const parsed = JSON.parse(text);
        if (!parsed || parsed.app !== "runtrack") {
          throw new Error("invalid");
        }
        setPendingBundle(parsed as ExportBundle);
        setImportOpen(true);
      } catch (err) {
        console.error(err);
        toast.error("File không hợp lệ", {
          description: "Chọn file JSON đã xuất từ RunTrack.",
        });
      }
    };
    reader.onerror = () => toast.error("Không đọc được file");
    reader.readAsText(file);
  }

  async function doImport(mode: "merge" | "replace") {
    if (!pendingBundle) return;
    setImporting(true);
    try {
      await importBundle(pendingBundle, mode);
      toast.success("Nhập dữ liệu thành công", {
        description:
          mode === "merge"
            ? "Đã gộp vào cơ sở dữ liệu hiện tại."
            : "Đã thay thế toàn bộ dữ liệu.",
      });
      setImportOpen(false);
      setPendingBundle(null);
    } catch (err) {
      console.error(err);
      toast.error("Không nhập được dữ liệu", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleDeleteProfile() {
    if (!activeProfileId) return;
    setDeleting(true);
    try {
      await db.transaction(
        "rw",
        db.profiles,
        db.runs,
        db.weights,
        db.achievements,
        async () => {
          await Promise.all([
            db.profiles.delete(activeProfileId),
            db.runs.where("profileId").equals(activeProfileId).delete(),
            db.weights.where("profileId").equals(activeProfileId).delete(),
            db.achievements.where("profileId").equals(activeProfileId).delete(),
          ]);
        }
      );
      setActiveProfile(null);
      toast.success("Đã xoá hồ sơ", {
        description: "Toàn bộ chạy, cân nặng và thành tích đã được xoá.",
      });
      setDeleteOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Không xoá được hồ sơ");
    } finally {
      setDeleting(false);
    }
  }

  // Loading guard — Dexie query still resolving or no active profile.
  if (!activeProfileId || !profile) {
    return <SettingsSkeleton />;
  }

  const currentWeightDisplay = displayWeight(profile.currentWeight, unitSystem, 1);
  const targetWeightDisplay = displayWeight(profile.targetWeight, unitSystem, 1);
  const weeklyKmDisplay = round(profile.targetKmPerWeek, 1);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 sm:space-y-6">
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      <SettingsHeader />

      {/* Appearance */}
      <SectionCard
        title="Giao diện"
        subtitle="Chế độ sáng/tối"
        icon={<Palette className="h-4 w-4" />}
        delay={0.02}
      >
        <SettingRow
          icon={<Monitor className="h-4 w-4" />}
          label="Chủ đề"
          description="Sáng, tối hoặc theo thiết bị"
        >
          <SegmentedControl<ThemeChoice>
            value={activeTheme}
            onChange={(v) => setTheme(v)}
            options={[
              { id: "light", label: "Sáng", icon: <Sun className="h-3.5 w-3.5" /> },
              { id: "dark", label: "Tối", icon: <Moon className="h-3.5 w-3.5" /> },
              { id: "system", label: "Hệ thống", icon: <Monitor className="h-3.5 w-3.5" /> },
            ]}
          />
        </SettingRow>
      </SectionCard>

      {/* Units */}
      <SectionCard
        title="Đơn vị đo"
        subtitle="Hiển thị metric hoặc imperial"
        icon={<Ruler className="h-4 w-4" />}
        delay={0.06}
      >
        <SettingRow
          icon={<Scale className="h-4 w-4" />}
          label="Hệ đơn vị"
          description={`Đang dùng: ${unitSystem === "metric" ? "kg · km" : "lbs · mi"}`}
        >
          <SegmentedControl<UnitChoice>
            value={unitSystem}
            onChange={(v) => setUnitSystem(v)}
            options={[
              { id: "metric", label: "Metric", sub: "kg · km" },
              { id: "imperial", label: "Imperial", sub: "lbs · mi" },
            ]}
          />
        </SettingRow>
        <p className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Dữ liệu luôn lưu chuẩn <strong className="text-foreground">kg</strong> và{" "}
          <strong className="text-foreground">km</strong>; đây chỉ là tuỳ chọn hiển thị.
        </p>
      </SectionCard>

      {/* Profile */}
      <SectionCard
        title="Hồ sơ"
        subtitle="Thông tin & quản lý"
        icon={<User className="h-4 w-4" />}
        delay={0.1}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ProfileAvatar colorId={profile.avatarColor} name={profile.name} size={64} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold tracking-tight">{profile.name}</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <ProfileStatChip label="Chiều cao" value={`${profile.height} cm`} />
              <ProfileStatChip
                label="Hiện tại"
                value={`${fmtNum(currentWeightDisplay, 1)} ${wUnit}`}
              />
              <ProfileStatChip
                label="Mục tiêu"
                value={`${fmtNum(targetWeightDisplay, 1)} ${wUnit}`}
                accent
              />
              <ProfileStatChip
                label="km/tuần"
                value={`${fmtNum(weeklyKmDisplay, 1)} ${dUnit}`}
              />
            </div>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            onClick={() => setEditOpen(true)}
            variant="outline"
            className="justify-center gap-2"
          >
            <Pencil className="h-4 w-4" /> Chỉnh sửa hồ sơ
          </Button>
          <Button
            onClick={() => setActiveProfile(null)}
            variant="outline"
            className="justify-center gap-2"
          >
            <ChevronRight className="h-4 w-4" /> Đổi hồ sơ
          </Button>
          <Button
            onClick={() => setDeleteOpen(true)}
            variant="destructive"
            className="justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" /> Xoá hồ sơ này
          </Button>
        </div>
      </SectionCard>

      {/* Account (server auth) */}
      <SectionCard
        title="Tài khoản"
        subtitle="Đăng nhập server — đồng bộ thiết bị"
        icon={<LogIn className="h-4 w-4" />}
        delay={0.15}
      >
        <AccountInfo />
      </SectionCard>

      {/* Data */}
      <SectionCard
        title="Dữ liệu"
        subtitle="Xuất / nhập JSON — nội bộ, riêng tư"
        icon={<Database className="h-4 w-4" />}
        delay={0.14}
      >
        <DataStatsRow counts={counts} />
        <StorageOverview />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="justify-center gap-2 border-transparent text-white grad-primary hover:opacity-90"
          >
            <Download className="h-4 w-4" /> {exporting ? "Đang xuất…" : "Xuất dữ liệu (JSON)"}
          </Button>
          <Button
            onClick={handlePickFile}
            disabled={importing}
            variant="outline"
            className="justify-center gap-2"
          >
            <Upload className="h-4 w-4" /> {importing ? "Đang nhập…" : "Nhập dữ liệu (JSON)"}
          </Button>
        </div>
        {/* CSV exports */}
        <div className="mt-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Xuất CSV (mở bằng Excel / Google Sheets)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={handleExportRunsCsv}
              disabled={exporting}
              variant="outline"
              size="sm"
              className="justify-center gap-2"
            >
              <Footprints className="h-3.5 w-3.5" /> Xuất buổi chạy (CSV)
            </Button>
            <Button
              onClick={handleExportWeightsCsv}
              disabled={exporting}
              variant="outline"
              size="sm"
              className="justify-center gap-2"
            >
              <Scale className="h-3.5 w-3.5" /> Xuất cân nặng (CSV)
            </Button>
          </div>
        </div>
        {exportSize != null && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Download className="h-3.5 w-3.5 text-primary" />
            Lần xuất gần nhất:{" "}
            <span className="font-semibold text-foreground tnum">
              {prettySize(exportSize)}
            </span>
          </p>
        )}
      </SectionCard>

      {/* About */}
      <SectionCard
        title="Giới thiệu"
        subtitle="RunTrack — bản nội bộ"
        icon={<Info className="h-4 w-4" />}
        delay={0.18}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-soft grad-primary">
              <Footprints className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">RunTrack</h3>
                <Badge variant="secondary" className="tnum">v1.0.0</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Theo dõi chạy bộ &amp; cân nặng — nội bộ, riêng tư.
              </p>
            </div>
          </div>
          <Separator />
          <InfoNote icon={<Database className="h-3.5 w-3.5" />}>
            Toàn bộ dữ liệu lưu cục bộ trong trình duyệt (IndexedDB) và không bao giờ
            rời khỏi thiết bị.
          </InfoNote>
          <InfoNote icon={<Download className="h-3.5 w-3.5" />}>
            Mẹo PWA: menu trình duyệt →{" "}
            <span className="font-medium text-foreground">"Cài đặt RunTrack"</span> để
            dùng offline.
          </InfoNote>
        </div>
      </SectionCard>

      {/* Keyboard shortcuts */}
      <SectionCard
        title="Phím tắt"
        subtitle="Di chuyển nhanh không cần chuột"
        icon={<Keyboard className="h-4 w-4" />}
        delay={0.2}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { keys: "N", label: "Ghi buổi chạy mới" },
            { keys: "L", label: "Chạy trực tiếp (GPS)" },
            { keys: "W", label: "Ghi cân nặng" },
            { keys: "F", label: "Ghi bữa ăn (AI)" },
            { keys: "S", label: "Tạo story" },
            { keys: "1-9", label: "Chuyển nhanh giữa các trang" },
            { keys: "Esc", label: "Đóng bảng nhập" },
          ].map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card/60 px-3 py-2.5"
            >
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <kbd className="rounded-lg border border-border bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground shadow-soft">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          className="max-w-md border-0 bg-transparent p-0 shadow-none sm:max-w-md"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
            <DialogDescription>
              Cập nhật tên, màu đại diện, thông số và mục tiêu.
            </DialogDescription>
          </DialogHeader>
          <AnimatePresence mode="wait">
            <motion.div
              key="profile-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <ProfileForm
                initial={profile}
                ctaLabel="Lưu"
                onDone={() => {
                  setEditOpen(false);
                  toast.success("Đã cập nhật hồ sơ ✨");
                }}
                onCancel={() => setEditOpen(false)}
              />
            </motion.div>
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Delete profile alert dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá hồ sơ "{profile.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xoá vĩnh viễn hồ sơ cùng toàn bộ buổi chạy, cân nặng và
              thành tích liên quan. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteProfile();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Đang xoá…" : "Xoá vĩnh viễn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import mode alert dialog */}
      <AlertDialog
        open={importOpen}
        onOpenChange={(o) => {
          if (!importing) setImportOpen(o);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nhập dữ liệu JSON</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <span>
                {pendingBundle ? (
                  <>
                    File chứa{" "}
                    <strong className="text-foreground">
                      {pendingBundle.profiles?.length ?? 0} hồ sơ
                    </strong>
                    ,{" "}
                    <strong className="text-foreground">
                      {pendingBundle.runs?.length ?? 0} buổi chạy
                    </strong>
                    ,{" "}
                    <strong className="text-foreground">
                      {pendingBundle.weights?.length ?? 0} cân nặng
                    </strong>
                    ,{" "}
                    <strong className="text-foreground">
                      {pendingBundle.achievements?.length ?? 0} thành tích
                    </strong>
                    . Chọn cách nhập:
                  </>
                ) : (
                  "Đang kiểm tra file…"
                )}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:items-stretch">
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doImport("merge");
              }}
              disabled={importing}
              className="justify-center gap-2 border-transparent text-white grad-primary hover:opacity-90"
            >
              <Check className="h-4 w-4" />
              {importing ? "Đang nhập…" : "Gộp (giữ dữ liệu hiện tại)"}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doImport("replace");
              }}
              disabled={importing}
              className="justify-center gap-2 bg-destructive text-white hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" /> Thay thế (xoá hết hiện tại)
            </AlertDialogAction>
            <AlertDialogCancel disabled={importing} className="mt-1">
              Huỷ
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================ Skeleton ============================ */

function SettingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 sm:space-y-6">
      <div className="h-14 animate-pulse rounded-2xl bg-muted/60" />
      <div className="h-28 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-36 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-48 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-44 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-44 animate-pulse rounded-3xl bg-muted/60" />
    </div>
  );
}

/* ============================ Header ============================ */

function SettingsHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="flex items-center gap-3"
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Database className="h-5 w-5" />
      </span>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          <span className="text-grad-primary">Cài đặt</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Giao diện, đơn vị, hồ sơ và dữ liệu.
        </p>
      </div>
    </motion.div>
  );
}

/* ============================ Setting row ============================ */

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{label}</div>
          {description && (
            <div className="truncate text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ============================ Segmented control ============================ */

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
}) {
  const lid = useId();
  return (
    <div
      role="radiogroup"
      className="inline-flex rounded-xl border border-border/70 bg-muted/50 p-1"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${lid}`}
                className="absolute inset-0 rounded-lg grad-primary shadow-soft"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {Icon}
              {opt.label}
              {opt.sub && (
                <span className="hidden text-[10px] font-medium opacity-70 sm:inline">
                  · {opt.sub}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================ Profile stat chip ============================ */

function ProfileStatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-lg border px-2 py-1 text-xs",
        accent
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/60 bg-muted/40 text-muted-foreground"
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
      <span className="tnum font-bold text-foreground">{value}</span>
    </span>
  );
}

/* ============================ Data stats row ============================ */

function DataStatsRow({
  counts,
}: {
  counts:
    | { profiles: number; runs: number; weights: number; achievements: number }
    | undefined;
}) {
  const items: { id: string; label: string; value: number; icon: React.ReactNode }[] = [
    { id: "profiles", label: "Hồ sơ", value: counts?.profiles ?? 0, icon: <User className="h-4 w-4" /> },
    { id: "runs", label: "Buổi chạy", value: counts?.runs ?? 0, icon: <Footprints className="h-4 w-4" /> },
    { id: "weights", label: "Cân nặng", value: counts?.weights ?? 0, icon: <Scale className="h-4 w-4" /> },
    { id: "achievements", label: "Thành tích", value: counts?.achievements ?? 0, icon: <Trophy className="h-4 w-4" /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.id}
          className="rounded-2xl border border-border/60 bg-card/60 p-3 text-center"
        >
          <div className="mx-auto mb-1.5 grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            {it.icon}
          </div>
          <div className="text-xl font-extrabold tracking-tight tnum">
            {fmtNum(it.value, 0)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================ Info note ============================ */

function InfoNote({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

/* ============================ Storage overview ============================ */

function StorageOverview() {
  const [storage, setStorage] = useState<{
    profiles: number;
    runs: number;
    weights: number;
    achievements: number;
    photos: number;
    progressPhotos: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    estimateStorage()
      .then((s) => {
        if (!cancelled) setStorage(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!storage || storage.total === 0) return null;

  const segments = [
    { label: "Hồ sơ", bytes: storage.profiles, color: "var(--brand-teal)" },
    { label: "Buổi chạy", bytes: storage.runs, color: "var(--brand-coral)" },
    { label: "Cân nặng", bytes: storage.weights, color: "var(--brand-violet)" },
    { label: "Ảnh chạy", bytes: storage.photos, color: "var(--brand-mint)" },
    { label: "Ảnh tiến bộ", bytes: storage.progressPhotos, color: "var(--brand-cyan)" },
    { label: "Thành tích", bytes: storage.achievements, color: "var(--brand-amber)" },
  ];
  const max = Math.max(...segments.map((s) => s.bytes), 1);

  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-card/60 p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Database className="h-3.5 w-3.5" /> Dung lượng dữ liệu
        </span>
        <span className="tnum text-sm font-bold text-foreground">{prettySize(storage.total)}</span>
      </div>
      {/* stacked bar */}
      <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-muted">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full transition-all"
            style={{
              width: `${(s.bytes / storage.total) * 100}%`,
              background: s.color,
              minWidth: s.bytes > 0 ? "2px" : "0",
            }}
            title={`${s.label}: ${prettySize(s.bytes)}`}
          />
        ))}
      </div>
      {/* legend */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="tnum font-semibold text-foreground">{prettySize(s.bytes)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ Account info ============================ */

function AccountInfo() {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (s?.user) {
          setEmail(s.user.email ?? null);
          setName(s.user.name ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-12 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
          <p className="truncate text-sm font-bold">{email ?? "—"}</p>
        </div>
      </div>
      {name && (
        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tên</p>
            <p className="text-sm font-bold">{name}</p>
          </div>
        </div>
      )}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => {
          signOut({ callbackUrl: "/" });
        }}
      >
        <LogOut className="h-4 w-4" /> Đăng xuất
      </Button>
    </div>
  );
}
