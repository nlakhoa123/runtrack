# RunTrack — Worklog & Handover

## Project overview
RunTrack: premium local running & weight-tracking PWA. Built on Next.js 16 (App Router) but runs fully client-side — all data in IndexedDB via Dexie. No server/internet at runtime. Multiple profiles per machine.

Design language: mint→teal→cyan primary gradient, coral/amber energy accent, glassmorphism on floating layers, Plus Jakarta Sans, dark mode with deep slate-teal + glowing accents. All animations via Framer Motion.

## Architecture (already built — Task 0)
- `src/lib/rt/types.ts` — Profile, RunSession, WeightEntry, AchievementRecord, ViewId, FEELINGS, AVATAR_COLORS, avatarGradient()
- `src/lib/rt/db.ts` — Dexie database `runtrack-db` (profiles, runs, weights, achievements) with compound indexes; `uid()`
- `src/lib/rt/utils.ts` — unit conversions (kg/lb, km/mi), calcCalories (MET-based), calcAvgSpeed, calcPace, fmtDuration, round, clamp, fmtNum, displayWeight/displayDistance
- `src/lib/rt/dates.ts` — todayKey, currentWeekKeys (Mon-start), weekKeysForOffset, lastNDays, monthMatrix, computeStreak
- `src/lib/rt/insights.ts` — computeStats (weekKm, streak, weightLost, goalPct, weightGoalPct, weightEtaWeeks…), buildWeeklyInsight, heatmapIntensity, weeklyBuckets
- `src/lib/rt/achievements.ts` — ACHIEVEMENTS defs (14), TIER_STYLE, bestStreakEver, evaluateAchievements (persists new unlocks, returns newly[]), defForType
- `src/lib/rt/exportImport.ts` — exportAll/importBundle/downloadJson/prettySize
- `src/store/rt-store.ts` — Zustand (persisted to localStorage): activeProfileId, activeView, unitSystem, onboarded, quickAdd, celebrationQueue + actions
- `src/components/rt/theme-provider.tsx` — next-themes wrapper
- `src/components/rt/shared/` — count-up, progress-ring, profile-avatar, stat-card, empty-state, section-card, wheel-picker, celebration-modal
- `src/components/rt/onboarding/` — onboarding.tsx (welcome→picker→form), profile-form.tsx (3-step wizard)
- `src/components/rt/layout/` — top-bar (profile switcher popover + Ghi chạy + cân nặng + theme toggle), bottom-nav (desktop rail + mobile bar with layoutId active pill), theme-toggle
- `src/components/rt/quick-add/` — run-sheet (sliders, live calorie/speed/pace, emoji feeling, quick-log-last, achievement eval), weight-sheet (wheel picker, diff banner, syncs profile.currentWeight)
- `src/components/rt/app-shell.tsx` — TopBar + AnimatePresence view router + BottomNav, mounts sheets & celebration globally
- `src/app/page.tsx` — mounted gate → Onboarding | AppShell; registers /sw.js
- `public/manifest.webmanifest`, `public/icon.svg`, `public/sw.js` — PWA + offline
- `src/app/globals.css` — custom premium palette (light + dark), brand ramps, gradient utilities, glass, shadow-soft/lift/glow, custom scrollbar, range accent

## Data contracts for view components
Each view is a default-export client component at `src/components/rt/views/<name>-view.tsx`. They:
- read `activeProfileId` / `unitSystem` from `useRtStore`
- read profile + data via `useLiveQuery(() => db...., [deps])`
- use shared primitives from `@/components/rt/shared/*`
- use `computeStats(profile, runs, weights)` from `@/lib/rt/insights` for dashboard metrics
- import `db` from `@/lib/rt/db`, types from `@/lib/rt/types`, utils from `@/lib/rt/utils`, dates from `@/lib/rt/dates`

## Task status
- [done] 0 — Foundation
- [pending] 1-a — Onboarding (already implemented in Task 0 as part of foundation; onboarding.tsx + profile-form.tsx complete)
- [pending] 1-b — Run logging sheet (already implemented in Task 0; run-sheet.tsx complete)
- [pending] 1-c — Weight logging sheet (already implemented in Task 0; weight-sheet.tsx complete)
- [pending] 1-d — Dashboard view
- [pending] 1-e — Runs view + Weight view (charts & history)
- [pending] 2-a — Goals view
- [pending] 2-b — Compare view
- [pending] 2-c — Achievements view
- [pending] 3 — Settings view + PWA polish
- [pending] 4 — Self-verify + cron

---
Task ID: 0
Agent: main (Z.ai Code)
Task: Foundation — palette, fonts, Dexie DB, types, store, utils, achievements, insights, export/import, onboarding, quick-add sheets, app shell, PWA assets, page gate.

Work Log:
- Installed dexie, dexie-react-hooks, canvas-confetti + types.
- Wrote premium mint→teal palette in globals.css (light + dark) with brand ramps, gradients, glass, shadows, custom scrollbar.
- layout.tsx: Plus Jakarta Sans, next-themes provider, manifest, themeColor, viewport with cover.
- lib/rt: types, db (Dexie), utils (units + calorie + pace), dates (streak + week helpers), insights (computeStats + weekly insight + heatmap + weekly buckets), achievements (14 defs + evaluate), exportImport.
- store/rt-store.ts: Zustand persisted (activeProfileId, activeView, unitSystem, onboarded, quickAdd, celebrationQueue).
- shared primitives: CountUp, ProgressRing, ProfileAvatar, StatCard, EmptyState, SectionCard, WheelPicker, CelebrationModal (confetti).
- onboarding: welcome (animated hero + feature list) → picker (profile cards) → 3-step ProfileForm (identity/body/goal with sliders).
- layout: TopBar (profile switcher popover, Ghi chạy + cân nặng + animated theme toggle), BottomNav (desktop rail + mobile bar, layoutId active pill).
- quick-add: RunSheet (live gradient summary, sliders, emoji feeling, quick-log-last, achievement eval on save), WeightSheet (iOS wheel picker, diff banner, syncs profile.currentWeight).
- app-shell: view router with AnimatePresence + dynamic imports; mounts sheets & celebration globally.
- page.tsx: mounted gate + onboarding/shell switch + sw registration. PWA: manifest, icon.svg, sw.js (offline shell).

Stage Summary:
- Foundation compiles and runs; the app boots into onboarding when no profiles exist.
- All view files are currently stubs. Next: implement views (dashboard, runs, weight, goals, compare, achievements, settings).
- Shared primitives + lib contracts are stable; subagents should build views against them without modifying lib/store/shared files.

---
Task ID: 1-e (runs)
Agent: general-purpose (Runs view)
Task: Build Runs history view (weekly bar chart with goal line, animated timeline feed, delete, empty state).

Work Log:
- Read worklog.md to understand the foundation: Dexie tables, types, shared primitives, store contract, design system (mint→teal→cyan gradients, CSS variables, shadow utilities).
- Inspected shared primitives (SectionCard, StatCard, EmptyState, CountUp), utils (displayDistance, calcPace, fmtDuration, fmtNum, round), dates (currentWeekKeys, todayKey, fmtDate, subDays, differenceInCalendarDays, keyToDate), insights (weeklyBuckets, sumKm), types (FEELINGS, avatarGradient, RunSession, Profile), store (useRtStore with activeProfileId/unitSystem/setQuickAdd), and shadcn dropdown-menu + alert-dialog + button APIs.
- Overwrote src/components/rt/views/runs-view.tsx with a full premium implementation:
  • Loading guard: skeleton placeholders (animate-pulse) for header, 4 stat cards, chart, and 3 timeline rows while runs/profile are undefined.
  • Header: animated title + subtitle (total runs + total km) and a gradient "Ghi chạy" button → setQuickAdd('run').
  • Summary row: 4 StatCards (Tổng số chạy, Tổng km/mi, Tuần này, Chuỗi dài nhất) with CountUp, accent variants (primary/energy/rose), all distances converted via displayDistance.
  • Weekly chart (SectionCard "Quãng đường theo tuần"): recharts BarChart of weeklyBuckets(runs, 8), height 220, faint dashed horizontal CartesianGrid, hidden axis lines, subtle ticks. Two SVG linearGradients in <defs>: mint→teal→cyan for normal weeks, amber→coral (grad-energy) for the current week bar (highlighted via <Cell>). Rounded bar tops radius=[6,6,0,0], maxBarSize=36. ReferenceLine at goalDisplay (profile.targetKmPerWeek converted) styled as dashed coral line with "Mục tiêu X unit" label insideTopRight. Custom styled tooltip showing "Tuần N · hiện tại: Y unit". Legend (hidden on mobile) in SectionCard action.
  • Timeline feed (SectionCard "Lịch sử chạy"): chronological newest-first with date dividers ("Hôm nay / Hôm qua / d/M"). Each run is a horizontal card: circular gradient avatar (profile color) with feeling emoji on left; middle shows big distance + unit + date, then a wrap of chips (duration Clock, pace Gauge "X:XX min/km", calories Flame "N kcal", avg speed Route "X.X unit/h"); optional note in quotes. Right: ⋯ DropdownMenu with "Chỉnh sửa" (toast placeholder) and destructive "Xoá" (opens AlertDialog → db.runs.delete + success toast). Each entry animates in with whileInView, staggered delay = min(index*0.04, 0.32), hover lift.
  • Empty state: EmptyState emoji 👟, title "Chưa có buổi chạy nào", text, gradient Ghi chạy button.
  • All distances go through displayDistance(km, unitSystem, 2); pace is always min/km; avg speed converted to unit/h. unitLabel = "km" | "mi".
- Fixed TypeScript inference issue with useLiveQuery by using explicit type parameters (<RunSession[]>, <Profile | undefined>) and async querier functions to avoid the Promise<T> | T union ambiguity that was causing profile to be typed as PromiseExtended.
- Resolved lucide/recharts BarChart naming collision by using BarChart3 icon from lucide-react for the SectionCard icon.
- Verified: npx eslint src/components/rt/views/runs-view.tsx → 0 errors/warnings. npx tsc --noEmit → 0 errors in runs-view.tsx (remaining 5 TS errors are in pre-existing examples/ and skills/ dirs, outside scope).

Stage Summary:
- Runs view is complete and production-ready. Renders a premium gradient header with summary stats, a styled weekly distance bar chart with goal reference line and current-week highlight, and an animated timeline feed with date dividers, stat chips, and a delete-with-confirmation dropdown action.
- Strictly adheres to the shared contract: only writes to runs-view.tsx, no modifications to lib/store/shared/layout/onboarding. All hooks called unconditionally before early returns (loading/empty guards). Dark-mode safe via CSS variables only.
- Lint and type-check pass for the modified file. Next views to implement: weight (1-e cont.), goals (2-a), compare (2-b), achievements (2-c), settings (3).

---
Task ID: 1-d
Agent: general-purpose (Dashboard view)
Task: Build the premium Dashboard view (hero progress ring, stat cards, weekly goal bar, heatmap, insight, empty state).

Work Log:
- Read worklog.md + foundation contracts (db, types, utils, dates, insights, store, shared primitives, globals.css palette).
- Inspected shared components (StatCard, SectionCard, ProgressRing, CountUp, EmptyState, ProfileAvatar) to align with their prop APIs and class conventions.
- Wrote src/components/rt/views/dashboard-view.tsx as a single default-export client component, organized into focused subcomponents: DashboardSkeleton, HeroWeightCard, StatCardsGrid, HeatmapCard, WeeklyGoalCard, WeeklyInsightCard.
- Implemented loading guard returning an animated-pulse skeleton grid when profile/runs/weights are still resolving from Dexie.
- Implemented empty state (runs.length === 0 && weights.length <= 1) using shared EmptyState with a grad-primary CTA that triggers setQuickAdd('run').
- Built HeroWeightCard: grad-primary panel with white text, ProgressRing (size 176, stroke 16, mint→cyan gradient, white track) showing current weight via CountUp + unit, target weight, and pct chip; side panel shows "Còn X [unit] nữa" with CountUp, target weight, and an ETA chip when stats.weightEtaWeeks is present. Switches to "Bạn đã đạt mục tiêu! 🎉" copy when weightGoalPct >= 100 (covers target==current case).
- Built StatCardsGrid: 2-col on mobile, 4-col on sm+, four StatCards for week km (with delta when weekChangePct !== 0), streak, weight lost, and week calories — all values converted via displayDistance/displayWeight + unit labels.
- Built HeatmapCard: 17 weeks × 7 days (119 cells) using weekKeysForOffset for proper Mon-Sun columns, levels color-mapped mint→teal→coral→rose, future days rendered transparent, native title tooltips (date · km/nghỉ), horizontally scrollable on narrow viewports, with an Ít→Nhiều legend and a "Xem tất cả" action linking to runs view.
- Built WeeklyGoalCard: SectionCard with big % (CountUp), week/goal km breakdown, gradient progress bar (grad-primary → grad-energy at >=80%) animated via framer-motion width.
- Built WeeklyInsightCard: tone-driven gradient card (energy/rose/primary) with white text for non-info tones, plain card for info tone; emoji badge, tone label chip, title, text, and a "Xem tất cả" link to runs view.
- Used consistent framer-motion entrance (opacity+16px y, 0.55s, [0.22,1,0.36,1] ease) with staggered delays; selected Zustand state via individual selectors to minimize re-renders.
- Ran `bunx eslint src/components/rt/views/dashboard-view.tsx` (clean) and `bunx tsc --noEmit` (clean for the rt tree). Initial tsc surfaced a Promise type unification issue on the weights useLiveQuery (PromiseExtended vs Promise<never[]>) — fixed by switching runs/weights queriers to async functions returning a typed empty array fallback.
- Verified full `bun run lint`: remaining error/warning are pre-existing in src/hooks/use-mounted.ts and src/components/rt/quick-add/weight-sheet.tsx (foundation files outside this task's scope; not touched).

Stage Summary:
- File written: src/components/rt/views/dashboard-view.tsx (530 lines, single default export DashboardView + 6 internal helper components).
- All required sections present: loading skeleton, hero weight ring, 4 stat cards, weekly km goal bar, 119-day heatmap, weekly insight, empty state, "Xem tất cả" links to runs view.
- Lint + tsc clean for the new file. No files outside src/components/rt/views/dashboard-view.tsx were modified.
- Premium design language respected: grad-primary hero, SectionCard wrappers, CountUp big numbers with tnum, dark-mode safe CSS variables throughout, framer-motion entrance with staggered delays, responsive 2/4-col and lg:grid-cols-2 layouts.
- Next: views 1-e (runs + weight history charts) can reuse the same SectionCard/StatCard/EmptyState primitives and the unit-conversion helpers used here.

---
Task ID: 1-e (weight)
Agent: general-purpose (Weight view)
Task: Build Weight view (gradient area chart with target line, latest hero with diff, history list with delete + sync, empty state).

Work Log:
- Read worklog.md to understand the foundation: Dexie tables (weights: id, profileId, date, createdAt, [profileId+createdAt]), types (WeightEntry, Profile), shared primitives (SectionCard, EmptyState, CountUp, StatCard), store (useRtStore with activeProfileId/unitSystem/setQuickAdd), design system (mint→teal→cyan gradients, CSS variables for brand-teal/cyan/coral, shadow-soft/lift/glow).
- Inspected runs-view.tsx and dashboard-view.tsx as templates for useLiveQuery typing pattern (explicit generic <T[]> with async querier returning typed array), SectionCard usage, framer-motion entrance constants, recharts Tooltip content render-prop, AlertDialog delete-confirm pattern, and DropdownMenu actions.
- Inspected lib/rt/utils.ts (displayWeight, round, fmtNum, parseWeightInput), lib/rt/dates.ts (fmtDate with patterns), lib/rt/types.ts (WeightEntry shape), src/components/ui/* (button, badge, separator, dropdown-menu, alert-dialog APIs).
- Overwrote src/components/rt/views/weight-view.tsx with a full premium implementation organized as one default-export component + 3 helper components (HeroStat, DiffChip, WeightSkeleton):
  • Loading guard: animated-pulse skeleton (hero block, 4 stat placeholders, chart block, 4 history rows) returned while sorted/profile are undefined.
  • Hero latest-weight card: grad-primary panel with white text, two decorative blurred blobs, big CountUp of latest weight in active unit + unit label, diff chip vs previous entry colored by direction toward goal (emerald if good, coral if away, white if neutral), "Ghi cân nặng" button → setQuickAdd('weight'). Below a separator: 3 HeroStat tiles — Mục tiêu (target weight), Còn lại/Đã đạt mục tiêu (computed from latestDisplay - targetDisplay, switches to 🎉 celebration state when reachedGoal), Tổng thay đổi (latest - first). HeroStat uses bg-white/10 backdrop-blur tiles, emerald ring when goal reached.
  • Direction-toward-goal logic: losingGoal = profile.targetWeight <= firstWeight. diffGood = losingGoal ? diff < 0 : diff > 0. reachedGoal = losingGoal ? latest.weightKg <= targetWeight : latest.weightKg >= targetWeight. Keeps semantics correct whether user is cutting or bulking.
  • Area chart (SectionCard "Xu hướng cân nặng"): recharts AreaChart, height 280, data = weights.map(w => ({ date: w.date, weight: displayWeight(w.weightKg, unitSystem, 1), raw: w.weightKg })). XAxis dataKey="date" tickFormatter fmtDate(d,'d/M'), minTickGap 20, hidden axis lines, subtle ticks. YAxis domain ['auto','auto'], width 40, hidden axis lines, integer tickFormatter. Two SVG linearGradients in <defs>: weightGrad (mint→teal→cyan vertical, opacity 0.85→0.05) for fill and weightStroke (mint→teal→cyan horizontal) for the line. Area: type="monotone", dataKey="weight", stroke="url(#weightStroke)", strokeWidth 3, fill="url(#weightGrad)", custom activeDot (r=6, teal ring, background fill). ReferenceLine y=targetDisplay stroke="var(--brand-coral)" strokeDasharray="6 6" with "Mục tiêu" label insideTopLeft in coral. Custom Tooltip content: rounded popover card showing fmtDate(date,'d MMM yyyy'), big weight + unit, and a diff-from-previous chip (emerald if toward goal, rose if away, muted if neutral). Legend in SectionCard action (teal dot + dashed coral line).
  • History list (SectionCard "Lịch sử cân nặng"): newest-first by reversing the ascending sorted array. Each row: left date tile (bg-muted/60 rounded-xl, month label uppercase + day big) for visual rhythm; middle big weight (2xl font-extrabold tnum) + unit + diff chip (DiffChip component: emerald if good, rose if away, muted Scale icon if neutral) or "Đầu tiên" outline Badge for first entry, optional note in quotes; right ⋯ DropdownMenu with destructive "Xoá" item → opens AlertDialog → on confirm: db.weights.delete(id), re-fetch remaining weights sorted by createdAt, db.profiles.update(activeProfileId, { currentWeight: newLatest.weightKg }), toast success/error. Each row animates in with whileInView, staggered delay = min(index*0.04, 0.32), hover lift.
  • Empty state: EmptyState emoji ⚖️, title "Bắt đầu theo dõi cân nặng", text "Cân nặng đầu tiên đã được ghi. Hãy cập nhật đều để xem xu hướng!", action button grad-primary → setQuickAdd('weight'). Triggered when sorted.length <= 1.
  • All weight values stored in kg in DB, displayed via displayWeight(kg, unitSystem, 1); unitLabel = "kg" | "lbs".
- Fixed useLiveQuery TypeScript inference by using explicit generic <WeightEntry[]> and <Profile | undefined> with async querier functions returning typed arrays (the documented Dexie quirk).
- Verified: bunx eslint src/components/rt/views/weight-view.tsx → 0 errors/warnings. bunx tsc --noEmit → no errors in weight-view.tsx (remaining errors are in pre-existing examples/ and skills/ dirs, plus a pre-existing use-mounted.ts warning in foundation files — all outside this task's scope).
- Full project lint: bun run lint shows only the pre-existing use-mounted.ts error and weight-sheet.tsx unused-disable warning; no new issues introduced by this view.

Stage Summary:
- File written: src/components/rt/views/weight-view.tsx (single default export WeightView + HeroStat, DiffChip, WeightSkeleton helpers). ~660 lines.
- All required sections present: loading skeleton, grad-primary hero with CountUp + diff chip + target/remaining/total-change tiles, gradient area chart with target reference line + custom tooltip with diff, animated history list with date tiles + diff chips + delete-with-confirm + profile.currentWeight re-sync, empty state for <=1 entry.
- Strictly adheres to the shared contract: only writes to weight-view.tsx, no modifications to lib/store/shared/layout/onboarding. All hooks called unconditionally before early returns (loading/empty guards). Dark-mode safe via CSS variables only (var(--brand-teal/cyan/coral/mint/rose), var(--background), var(--muted-foreground)).
- Lint and type-check pass for the modified file. Next views to implement: goals (2-a), compare (2-b), achievements (2-c), settings (3).

---
Task ID: 2-a
Agent: general-purpose (Goals view)
Task: Build Goals view (weight goal ring + ETA, weekly km progress bar, slider editor with save, milestones).

Work Log:
- Read worklog.md to understand the foundation: Dexie tables, types, shared primitives, store contract, design system (mint→teal→cyan gradients, CSS variables, shadow utilities), and the AppShell view-router wrapper (already provides `<main class="max-w-5xl">`).
- Inspected shared primitives (SectionCard, ProgressRing, CountUp, StatCard, EmptyState), utils (displayWeight/displayDistance/parseWeightInput/round/fmtNum/weightLabel/distanceLabel), insights (computeStats → DashboardStats with weightGoalPct, weightEtaWeeks, weightLost, weightStart, weightCurrent, weekKm, goalKm, goalPct, totalKm, streak), dates (currentWeekKeys), types (Profile with targetWeight/targetKmPerWeek/currentWeight), store (useRtStore with activeProfileId/unitSystem), shadcn Slider/Button, and the existing dashboard-view + profile-form for slider/value patterns.
- Overwrote src/components/rt/views/goals-view.tsx with a full premium implementation (single default export GoalsView + 6 internal subcomponents: GoalsSkeleton, GoalsHeader, WeightGoalCard, NoGoalPrompt, MiniStat, WeeklyKmGoalCard, GoalEditorCard, MilestonesStrip).
  • Loading guard: animated-pulse skeleton (header + 4 card placeholders) while activeProfileId/profile/runs/weights are still resolving from Dexie.
  • Header: animated gradient title "Mục tiêu" with Flag icon badge and subtitle.
  • WeightGoalCard (SectionCard "Mục tiêu cân nặng" icon Scale): ProgressRing (size 150, stroke 14, mint→cyan) with center showing weightGoalPct + "%" via CountUp and a "tiến độ" label; beside it a 2×2 MiniStat grid (Hiện tại / Mục tiêu / Đã giảm|Đã tăng|Chưa thay đổi with TrendingDown/Up icon + emerald/amber tone / Còn lại|Đã chạm đích). Detects no-goal case (weightStart ≈ target) and renders a NoGoalPrompt instead. Below: ETA chip "ước tính ≈ X tuần nữa" (CalendarClock) when weightEtaWeeks != null && !achieved, or a celebratory emerald chip when achieved, plus encouraging copy that adapts to achieved/has-ETA/no-data states.
  • WeeklyKmGoalCard (SectionCard "Mục tiêu km/tuần" icon Footprints): big goalPct % (CountUp), "Tuần này: X / Y {unit}" line via fmtNum, a "N buổi chạy" chip (computed from runs whose date ∈ currentWeekKeys()), a gradient progress bar that switches grad-primary → grad-energy at >=80% and adds shadow-glow at 100%, and a contextual status message (done/high/started/empty).
  • GoalEditorCard (SectionCard "Chỉnh sửa mục tiêu" icon Target): two Sliders — target weight (30..180 in active unit, step 0.1, live value in text-grad-primary) and weekly km (0..80, step 1). Local state synced from profile via useEffect keyed on `${profile.id}:${unitSystem}` (lastSyncedKey ref) so it pre-fills on first load, profile switch, and unit switch without clobbering in-flight edits. Helper text under target weight animates via AnimatePresence between "Sẽ giảm X {unit} ✨" (emerald) / "Sẽ tăng X {unit} 💪" (amber) / "Giữ nguyên" (muted), computed against displayWeight(profile.currentWeight). "Lưu mục tiêu" button (grad-primary, Save icon) calls db.profiles.update(profileId, { targetWeight: parseWeightInput(targetInput, unitSystem), targetKmPerWeek: weeklyKm }) then toast.success("Đã cập nhật mục tiêu 🎯"); error → toast.error; disabled while saving.
  • MilestonesStrip (SectionCard "Cột mốc" icon Flag, subtitle "X/6 đã đạt"): horizontally scrollable (no-scrollbar) row of 6 unit-aware milestone chips (−1/−5 {wUnit}, 10 {dUnit}/tuần, Tổng 50/100 {dUnit}, Streak 7). Reached chips render as filled grad-primary with white text + Sparkles icon + shadow-soft; unreached render as muted border/bg with Flag icon. Each chip animates in (opacity+scale) with whileHover lift. Computed reached booleans from stats.weightLost (kg thresholds, unit-stable), displayDistance(stats.weekKm/totalKm), stats.streak.
  • CountUp used for all big numbers (ring %, MiniStat values, weekly goalPct). All distances/weights converted via displayDistance/displayWeight + unit labels (km/mi, kg/lbs). Dark-mode safe via CSS variables only.
- Fixed two correctness issues during implementation: (1) moved the runsThisWeekCount useMemo ABOVE the loading-guard early return to respect the Rules of Hooks (hooks must run unconditionally); (2) replaced the verbose `ReturnType<typeof useRtStore.getState>["unitSystem"]` prop type with a clean imported `UnitSystem` type across all 4 subcomponents.
- Used explicit generics on useLiveQuery (`<Profile | undefined>`, `<RunSession[]>`, `<WeightEntry[]>`) with async querier functions returning typed empty-array fallbacks, matching the pattern that resolved the PromiseExtended inference quirk in earlier views.
- Verified: `bun run lint` → 0 errors/warnings in goals-view.tsx (the only remaining lint findings are pre-existing in src/hooks/use-mounted.ts and src/components/rt/quick-add/weight-sheet.tsx, outside this task's scope). `npx tsc --noEmit` → 0 errors in goals-view.tsx (remaining TS errors are pre-existing in examples/ and skills/ dirs, outside scope).

Stage Summary:
- File written: src/components/rt/views/goals-view.tsx (647 lines, single default export GoalsView + 8 internal helper components).
- All required sections present: loading skeleton, weight-goal ring with ETA chip + no-goal prompt, weekly km progress bar (gradient swap + glow) with runs-this-week stat, slider editor with live helper text + save-to-Dexie + toast, horizontally-scrollable milestones strip with reached/unreached styling.
- Strictly adheres to the shared contract: only writes to goals-view.tsx, no modifications to lib/store/shared/layout/onboarding. All hooks called unconditionally before early returns. Unit-aware throughout (metric/imperial). Dark-mode safe via CSS variables only.
- Lint + tsc clean for the new file. Next views to implement: compare (2-b), achievements (2-c), settings (3).

---
Task ID: 3
Agent: general-purpose (Settings view)
Task: Build Settings view (appearance theme segmented, units, profile edit/delete, export/import JSON, data counts, about).

Work Log:
- Read worklog.md to understand the foundation, prior view patterns, and the shared contracts (Dexie tables, useRtStore, useLiveQuery typing quirk, export/import helpers, useTheme, SectionCard/ProfileAvatar, ProfileForm prop API).
- Inspected: src/lib/rt/exportImport.ts (exportAll → ExportBundle, importBundle(bundle, "merge"|"replace"), downloadJson, prettySize), src/store/rt-store.ts (activeProfileId, unitSystem, setUnitSystem, setActiveProfile), src/lib/rt/types.ts (Profile shape), src/lib/rt/utils.ts (displayWeight/weightLabel/distanceLabel/fmtNum/round), src/components/rt/onboarding/profile-form.tsx (3-step wizard with initial/onDone/onCancel/ctaLabel props), src/components/rt/shared/{section-card,profile-avatar,empty-state}, src/components/ui/{dialog,alert-dialog,button,separator,badge}, and goals-view.tsx + weight-view.tsx for the established useLiveQuery + SectionCard + AlertDialog-delete + entrance-animation patterns.
- Overwrote src/components/rt/views/settings-view.tsx (770 lines, single default export SettingsView + 7 internal helper components: SettingsSkeleton, SettingsHeader, SettingRow, SegmentedControl, ProfileStatChip, DataStatsRow, InfoNote).
  • Loading guard: animated-pulse skeleton (header + 5 card placeholders) returned while activeProfileId/profile are still resolving from Dexie.
  • Header: animated gradient title "Cài đặt" with Database icon badge + subtitle.
  • Appearance section (SectionCard icon Palette): SettingRow with a 3-option SegmentedControl (Sáng/Sun · Tối/Moon · Hệ thống/Monitor) wired to useTheme().setTheme. Active option is resolved from `theme ?? "system"` (no hydration mismatch — both server & client first render "system", then next-themes updates after mount). Active highlight uses framer-motion shared layoutId (spring 380/32) so the grad-primary pill slides between options.
  • Units section (SectionCard icon Ruler): SettingRow with a 2-option SegmentedControl (Metric "kg · km" · Imperial "lbs · mi") wired to setUnitSystem. Below: a muted helper note explaining that data always stays canonical kg/km — the toggle only affects display.
  • Profile section (SectionCard icon User): ProfileAvatar (size 64) + name + a wrap of ProfileStatChips (Chiều cao cm, Hiện tại, Mục tiêu accent, km/tuần) all converted via displayWeight/weightLabel/distanceLabel. Three buttons in a sm:grid-cols-3 row: "Chỉnh sửa hồ sơ" (outline, opens Dialog with the shared ProfileForm initial={profile} ctaLabel="Lưu" onDone=close+toast), "Đổi hồ sơ" (outline → setActiveProfile(null)), "Xoá hồ sơ này" (destructive → AlertDialog confirm → db.transaction("rw", profiles/runs/weights/achievements) deleting profile + cascading runs/weights/achievements by profileId → setActiveProfile(null) → toast). Edit Dialog is rendered borderless/bg-transparent with showCloseButton=false so the ProfileForm's own rounded-3xl card is the visible surface; wrapped in AnimatePresence + motion.div for fade entrance.
  • Data section (SectionCard icon Database): DataStatsRow showing 4 count tiles (Hồ sơ / Buổi chạy / Cân nặng / Thành tích) from a single useLiveQuery<{profiles,runs,weights,achievements}> that Promise.all's db.*.count(). Two buttons (sm:grid-cols-2): "Xuất dữ liệu (JSON)" grad-primary → exportAll() → compute JSON byte size via Blob → downloadJson(`runtrack-backup-YYYYMMDD.json`, bundle) → toast with size + counts; "Nhập dữ liệu (JSON)" outline → triggers hidden <input type="file" accept="application/json"> ref click → FileReader reads text → JSON.parse → validates `parsed.app === "runtrack"` → opens AlertDialog showing bundle counts and offering "Gộp" (merge, grad-primary) vs "Thay thế" (replace, destructive) actions. Each action preventDefaults the radix auto-close, then calls importBundle(pendingBundle, mode) and toasts success/error. Invalid file → toast.error("File không hợp lệ"). Last-export size chip shown when exportSize != null via prettySize.
  • About section (SectionCard icon Info): grad-primary Footprints icon tile + "RunTrack" name + v1.0.0 Badge + tagline "Theo dõi chạy bộ & cân nặng — nội bộ, riêng tư." Separator + two InfoNote cards: (1) all data stored locally in IndexedDB and never leaves the device; (2) PWA hint to install via browser menu → "Cài đặt RunTrack" for offline use.
  • All five sections stagger via SectionCard's `delay` prop (0.02 → 0.18) on the standard framer-motion entrance (opacity+y16, 0.55s, [0.22,1,0.36,1]).
- Lint + type-check verified clean for the new file: `bunx eslint src/components/rt/views/settings-view.tsx` → 0 errors/warnings; `bunx tsc --noEmit` → no settings-view errors. Full `bun run lint` shows only the two pre-existing issues in src/hooks/use-mounted.ts (foundation) and src/components/rt/quick-add/weight-sheet.tsx (foundation) — neither touched by this task.
- Followed the documented Dexie-React-Hooks typing quirk: explicit generic on useLiveQuery (`<Profile | undefined>` and `{...} | undefined`) with async querier functions to avoid the PromiseExtended union ambiguity seen in earlier views.
- Avoided the `react-hooks/set-state-in-effect` lint rule (which already fires on the foundation use-mounted.ts) by not needing a mounted flag at all — `theme ?? "system"` is hydration-safe because both server and client render "system" before next-themes hydrates.

Stage Summary:
- File written: src/components/rt/views/settings-view.tsx (770 lines, single default export SettingsView + 7 internal helper components).
- All required sections present: loading skeleton, animated header, appearance (theme segmented Sáng/Tối/Hệ thống with shared-layout highlight), units (metric/imperial segmented + canonical-data note), profile (avatar + stat chips + edit Dialog with ProfileForm + change profile + delete-with-AlertDialog-in-transaction), data (4 live counts + export to JSON file + import via hidden file input → AlertDialog merge/replace → importBundle + last-export size chip), about (app name, v1.0.0 badge, tagline, local-IndexedDB note, PWA install hint).
- Strictly adheres to the shared contract: only writes to settings-view.tsx, no modifications to lib/store/shared/layout/onboarding. All hooks (useRtStore selectors ×4, useTheme, useLiveQuery ×2, useState ×8, useRef) called unconditionally before the loading-guard early return. Dark-mode safe via CSS variables and existing palette utilities (grad-primary, bg-primary/10, bg-muted/40, border-border/60, etc.) — no hardcoded colors.
- Lint + tsc clean for the new file. Next: Task 4 (self-verify + cron) and the remaining stub views (compare 2-b, achievements 2-c) — out of this task's scope.

---
Task ID: 2-b
Agent: general-purpose (Compare view)
Task: Build Head-to-head compare view (profile pickers, race-bar animated comparison, overlaid weight line chart, side-by-side stats).

Work Log:
- Read worklog.md to understand the foundation, shared contracts, design system, and the AppShell wrapper (provides `<main class="max-w-5xl">` externally).
- Inspected shared primitives (SectionCard, ProfileAvatar, CountUp, EmptyState, StatCard), shadcn Select API, lucide icon set, lib/rt/insights (computeStats + DashboardStats, sumKm), lib/rt/dates (currentWeekKeys, fmtDate), lib/rt/utils (displayDistance, displayWeight, distanceLabel, weightLabel, fmtNum, round), lib/rt/types (Profile, RunSession, WeightEntry, UnitSystem), store (useRtStore with activeProfileId, unitSystem, setActiveProfile), and earlier views (goals-view, weight-view, runs-view) for useLiveQuery typing pattern + recharts tooltip render-prop pattern.
- Overwrote src/components/rt/views/compare-view.tsx with a full premium implementation organized as one default-export component + 9 internal subcomponents (CompareSkeleton, CompareHeader, ProfilePickerRow, ProfilePicker, HeadToHeadCard, HeadToHeadSide, RaceBarSection, RaceMetric, RaceBar, WeightTrendSection, LegendChip, WeightTooltip, TooltipRow, SideBySideStats, SideStatRow) + a `buildMergedWeightTimeline` helper.
  • Loading guard: animated-pulse skeleton grid (header, pickers, head-to-head, chart, side-by-side) returned while Dexie still resolving profiles or runs/weights.
  • Empty state: EmptyState emoji 👥, title "Cần ít nhất 2 hồ sơ", text "Thêm hồ sơ thứ hai để so sánh.", action button grad-primary → `useRtStore.getState().setActiveProfile(null)` (which triggers the page gate to show Onboarding so the user can add a second profile).
  • Profile pickers: two shadcn Select dropdowns ("Hồ sơ A" teal-tagged, "Hồ sơ B" coral-tagged) at the top, each showing the avatar + name of the selected profile in the trigger. Options disable the profile currently selected by the other picker (`disabled` + ". đang chọn" suffix) so the same profile cannot be picked twice. Effective selected ids are derived in render via useMemo from the user's `aId`/`bId` + the live `profiles` list: defaults to the first two profiles, recovers from deletion, and swaps to a different profile if both ever resolve to the same id.
  • Head-to-head card: 3-column grid `[1fr auto 1fr]` with both avatars + names on the outside and an animated pulsing VS badge in the center. Each side shows this-week km via CountUp in the active distance unit and a status chip ("Đang dẫn đầu" / "Đang theo sau" / "Hoà"); the leader gets a ring around their avatar + a small animated Crown badge. Decorative blurred blobs (primary + coral) for depth.
  • Race-bar comparison (SectionCard "Đua tuần này" icon Swords): for each of 5 metrics (Tuần này km, Tổng km, Chuỗi ngày, Calo tuần, Đã giảm kg), a card with two horizontal bars stacked — profile A on top, profile B on bottom — each bar preceded by a small ProfileAvatar + name and a trailing value chip. Bar widths are computed as `value / max(a,b) * 100` (clamped 2%..100%, zero stays at 0) and animated from 0 with framer-motion `whileInView={{ width: pct% }}` (1.1s, EASE). The winner's bar uses `grad-energy shadow-glow` and renders a small Trophy badge inside the right end (when there's room); the loser's bar uses a tinted muted background (`color-mix` of their accent color at 25%). All distances/weights converted via displayDistance/displayWeight with active unit labels. A "Hoà" chip appears when both are equal and non-zero.
  • Overlaid weight trend (SectionCard "Xu hướng cân nặng" icon Scale): recharts LineChart, height 280, with TWO Lines on a shared time axis. The dataset is built by `buildMergedWeightTimeline(aWeights, bWeights, unitSystem)` — union of both profiles' weight entry dates sorted ascending; for each date the function advances two cursors through each profile's date-sorted entries to find the last-known weight on or before that date (carry-forward), or `null` before the first entry. Points are `{ date, a: displayWeight(aKg, unit, 1), b: displayWeight(bKg, unit, 1) }`. Line A uses `var(--brand-teal)` strokeWidth 3, Line B uses `var(--brand-coral)` strokeWidth 3; both `dot={false}`, `type="stepAfter"` (visually conveys "carry-forward"), `connectNulls`, and styled `activeDot`. Faint dashed CartesianGrid (horizontal only), hidden axis lines, subtle ticks. Custom tooltip (WeightTooltip) shows fmtDate(d, "d MMM yyyy") and a row per profile with their avatar + color dot + name + value (or "—" when null). Legend = two chips with avatar + colored dot + name (rendered in SectionCard action on desktop, stacked above chart on mobile). Falls back to a friendly dashed-border empty state when neither profile has any weight entries.
  • Side-by-side stats (SectionCard "So sánh chi tiết" icon Activity): a 3-column grid `[1.4fr 1fr 1fr]` with a header row showing "Chỉ số" + each profile's avatar + name, then 5 stat rows (Cân nặng hiện tại, Cân nặng mục tiêu, Tổng số buổi chạy, Tổng quãng đường, Tốc độ TB tuần này). For "higher is better" rows (totalRuns, totalKm, avgSpeedThisWeek), the winner's cell gets `bg-emerald-500/10` + emerald bold text + a Crown icon; weights are left unranked (per a footer note explaining they depend on individual goal direction). Each row animates in with whileInView, staggered delay = 0.18 + idx*0.04. avgSpeedThisWeek is hidden ("—") when 0 to avoid misleading 0 km/h displays.
  • CountUp used in the head-to-head big numbers. All distances/weights go through displayDistance/displayWeight + unit labels (km/mi, kg/lbs). Dark-mode safe via CSS variables only (var(--brand-teal), var(--brand-coral), var(--brand-mint), var(--brand-cyan), var(--muted-foreground), var(--border), var(--background), var(--popover)). framer-motion entrances use the standard `{opacity:0,y:16} → {opacity:1,y:0}` with EASE [0.22,1,0.36,1] and staggered delays.
- Resolved two issues during implementation: (1) replaced an initial `useEffect` that called `setState` to default the pickers (lint `react-hooks/set-state-in-effect`) with a pure `useMemo` derivation of effective ids — defaults, deletion recovery, and same-id prevention all happen during render without setState-in-effect. (2) Removed unused `AnimatePresence` and `fmtDuration` imports after the refactor.
- Used explicit generics on every `useLiveQuery` (`<Profile[]>`, `<RunSession[]>`, `<WeightEntry[]>`) with async querier functions returning typed empty-array fallbacks (the documented Dexie PromiseExtended inference quirk).
- Verified: `bunx eslint src/components/rt/views/compare-view.tsx` → 0 errors / 0 warnings. `bunx tsc --noEmit` → 0 errors in compare-view.tsx (remaining TS errors are pre-existing in examples/ and skills/ dirs, outside scope). Full `bun run lint` shows only the pre-existing `use-mounted.ts` setState-in-effect error and the `weight-sheet.tsx` unused-disable warning — both in foundation files outside this task's scope.

Stage Summary:
- File written: src/components/rt/views/compare-view.tsx (~1340 lines, single default export CompareView + 14 internal helper components + 1 timeline builder).
- All required sections present: profile pickers (default to first two, prevent same-profile selection), head-to-head card with VS badge + leader crown, race-bar comparison with animated widths + Trophy-on-winner for 5 metrics, overlaid weight LineChart with two lines + carry-forward + custom tooltip + avatar legend chips, side-by-side 3-column stat grid with emerald highlight on better values.
- Strictly adheres to the shared contract: only writes to compare-view.tsx, no modifications to lib/store/shared/layout/onboarding. All hooks called unconditionally before early returns. Unit-aware throughout (metric/imperial). Dark-mode safe via CSS variables only.
- Lint + tsc clean for the new file. Next views to implement: achievements (2-c), settings (3).

---
Task ID: 2-c
Agent: general-purpose (Achievements view)
Task: Build Achievements grid (locked/unlocked styling, tier accents, header progress ring, progress hints, empty state).

Work Log:
- Read worklog.md to understand the foundation, shared contracts, design system, and the AppShell wrapper (already provides `<main class="max-w-5xl">` externally); studied prior views (goals, dashboard, compare, runs, weight) for the established useLiveQuery + SectionCard + framer-motion entrance patterns.
- Inspected: src/lib/rt/achievements.ts (ACHIEVEMENTS 14 defs, TIER_STYLE {ring,glow,label}, bestStreakEver, AchievementDef/AchievementCtx interfaces), src/lib/rt/insights.ts (computeStats + DashboardStats with totalKm/totalRuns/weekKm/streak/weightLost), src/lib/rt/dates.ts (fmtDateTime), src/lib/rt/types.ts (AchievementRecord shape), src/lib/rt/utils.ts (displayDistance/displayWeight/distanceLabel/weightLabel/fmtNum), src/store/rt-store.ts (activeProfileId, unitSystem), and shared primitives (SectionCard, ProgressRing, CountUp, EmptyState) + shadcn Progress.
- Overwrote src/components/rt/views/achievements-view.tsx with a full premium implementation (single default export AchievementsView + 3 internal helper components: AchievementsSkeleton, AchievementsHeader, BadgeCard + 1 helper function: computeProgressHint).
  • Loading guard: animated-pulse skeleton (header block + 8 grid placeholders) returned while activeProfileId/profile/runs/weights/unlocked are still resolving from Dexie.
  • Achievement context built via useMemo (before the loading guard to respect Rules of Hooks): runs computeStats + bestStreakEver(runDates) + longestRunKm to assemble an AchievementCtx with totalKm/totalRuns/longestRunKm/streak/bestStreak/weekKm/weightLost — same shape evaluateAchievements uses — powering the progress hints.
  • Header summary card: grad-primary panel with white text + two decorative blurred blobs. Left: ProgressRing (size 148, stroke 14, white-mint→amber gradient, white/30 track) with center showing Trophy icon + CountUp pct% + "đã mở khoá" label. Right: big CountUp unlockedCount + "/ total" denominator, encouraging copy that adapts to 0 / partial / all-done states ("Hãy bắt đầu hành trình…", "X/N huy hiệu đã mở khoá — tiếp tục phát!", "Tuyệt vời! Bạn đã mở khoá toàn bộ huy hiệu 🎉"), and a tier breakdown row of 4 chips (Đồng/Bạc/Vàng/Bạch kim) — each chip shows a glowing tier-color dot + label + "got/total" count.
  • Achievements grid (SectionCard "Bộ sưu tập huy hiệu" icon Trophy, subtitle "X/N đã mở khoá"): responsive grid (2 cols mobile / 3 cols sm / 4 cols lg). Each ACHIEVEMENTS def rendered as a BadgeCard.
  • BadgeCard: flex-col rounded-2xl border p-4, framer-motion entrance (opacity+y16+scale0.96, 0.5s EASE, staggered delay = min(i*0.04, 0.32)), whileHover y:-3 lift on both unlocked & locked. Unlocked card: tier-colored border (color-mix 55%), tier-glow shadow, radial halo at top, circular badge with tier ring border + tier-color radial background + emoji pulsing (scale 1→1.08→1 infinite) with drop-shadow glow, footer chip "Đã mở khoá · {fmtDateTime(unlockedAt,'d/M/yyyy')}" in tier color with Sparkles icon. Locked card: muted bg + opacity-60 grayscale emoji + tier-ring circle on muted bg + Lock icon badge at bottom-right of the circle + tier-label chip footer. mt-auto on footer so cards align bottoms regardless of description length.
  • Progress hints (locked cards only): computeProgressHint maps each achievement type to a {pct, current, goal} tuple — distance achievements use displayDistance in active unit (km/mi), weight achievements use displayWeight (kg/lbs), count/streak achievements use raw counts with "ngày" suffix for streaks. week_goal returns null when targetKmPerWeek <= 0. When pct >= 100 (rare race between data change and evaluateAchievements run), shows a friendly "Sắp mở khoá!" emerald note instead of current/goal labels. Below the labels (or "Sắp mở khoá!" note), a thin shadcn Progress bar (h-1.5, bg-muted) shows the percentage.
  • Empty state: EmptyState (emoji 🏆, title "Chưa có huy hiệu nào", text "Ghi nhận buổi chạy đầu tiên để mở khoá huy hiệu đầu tiên!") shown above the grid when unlockedCount === 0 — the locked grid still renders below so the user can preview all 14 badges and their progress hints.
  • All hooks (useRtStore ×2, useLiveQuery ×4 with explicit generics + async queriers, useMemo ×1) called unconditionally before the loading-guard early return. Dark-mode safe via CSS variables only (var(--muted), var(--background), var(--border), color-mix on tier ring). Tier colors come from TIER_STYLE which uses oklch() values that work in both light & dark.
- Verified: `bun run lint` → 0 errors/warnings anywhere in the repo (the previously-pre-existing use-mounted.ts and weight-sheet.tsx findings appear to have been resolved; the entire lint pass is now clean). `npx tsc --noEmit` → 0 errors in achievements-view.tsx (the only remaining TS errors are pre-existing in examples/ and skills/ dirs, outside scope).

Stage Summary:
- File written: src/components/rt/views/achievements-view.tsx (~420 lines, single default export AchievementsView + 3 helper components + 1 progress-hint function).
- All required sections present: loading skeleton, grad-primary header with ProgressRing + CountUp + tier breakdown chips, responsive achievements grid with locked/unlocked styling + tier accents, progress hints on locked cards (distance/weight/count/streak-aware, unit-converted), empty state above the grid when 0 unlocked.
- Strictly adheres to the shared contract: only writes to achievements-view.tsx, no modifications to lib/store/shared/layout/onboarding. All hooks called unconditionally before early returns. Dark-mode safe via CSS variables + oklch tier colors. Lint + tsc clean for the new file.
- Next views: all view stubs are now implemented (dashboard, runs, weight, goals, compare, achievements, settings). Remaining: Task 3 (settings polish already done) and Task 4 (self-verify + cron).

---
Task ID: 4 (main agent — integration, QA, bug fixes)
Agent: main (Z.ai Code)
Task: Integrate all views, self-verify with agent-browser, fix bugs, set up recurring review.

Work Log:
- Dispatched 7 subagents (Tasks 1-d, 1-e×2, 2-a, 2-b, 2-c, 3) to build the 7 view files against the foundation contracts. All completed cleanly.
- Fixed 2 pre-existing lint issues: rewrote src/hooks/use-mounted.ts to use useSyncExternalStore (no setState-in-effect); removed a stale eslint-disable in weight-sheet.tsx. Lint now fully clean (exit 0).
- End-to-end QA via agent-browser on the dev server:
  - Onboarding welcome → 3-step profile form (identity/body/goal sliders) → dashboard. Created profile "Sam".
  - Run sheet: sliders, live calorie/speed/pace, emoji feeling, duration chips, quick-log-last. Saved a 5 km run → dashboard updated (hero "Còn 5,0 kg nữa", heatmap, weekly goal, insight) + achievement celebration modal fired (confetti) for "Bước chân đầu tiên" + "Cột mốc 5K".
  - Weight sheet: iOS wheel picker. FOUND + FIXED A CRITICAL BUG — the wheel picker's initial programmatic snap (useEffect + scrollTo) raced and emitted a spurious onChange(30) before settling, causing a 70 kg entry to be saved as 30 kg. Rewrote src/components/rt/shared/wheel-picker.tsx to use useLayoutEffect with synchronous scrollTop assignment + a settlingRef guard that ignores scroll events during programmatic snaps; commits onChange only on genuine user scroll-end. Re-verified: now saves 70 correctly.
  - Weight view: gradient area chart + target reference line + history list with delete (re-syncs profile.currentWeight). Renders.
  - Runs view: weekly bar chart (gradient bars, current-week highlight, goal reference line) + animated timeline feed with delete. Renders.
  - Goals view: progress ring + ETA chip, weekly km bar, slider editor with save, milestones strip. Renders.
  - Achievements view: header progress ring + tier breakdown + grid of locked/unlocked badges with progress hints. Renders.
  - Settings view: theme segmented (Sáng/Tối/Hệ thống), units (Metric/Imperial), profile edit/delete, export/import JSON, data counts, about. Tested dark-mode toggle (html class → "dark") and export (no error).
  - Compare view: created 2nd profile "Jordan" via picker → "Thêm hồ sơ mới". Compare shows profile pickers, VS header, race-bar section, overlaid weight line chart, side-by-side stats. Renders.
- FIXED mobile nav UX gap: bottom nav only showed 5 of 7 items (Achievements + Settings unreachable on mobile). Changed ITEMS.slice(0,5) → ITEMS.map with compact scrollable layout; all 7 now reachable on mobile.
- FIXED service-worker staleness: original SW used cache-first for static assets, which served stale JS chunks in dev (broke HMR / hid the mobile-nav fix). Rewrote public/sw.js to be NETWORK-FIRST for all same-origin requests — fresh when online (dev HMR works), cache fallback when offline (PWA offline support preserved). Cleared stale SW + caches in the browser.
- Verified responsive: mobile (390×844) bottom nav = 7 items; desktop (1280×860) side rail = 7 items. No console errors, no runtime errors across all 7 views.

Stage Summary:
- All 9 feature areas (items 1–8 + settings) implemented and browser-verified. Lint clean. Dev server stable (all 200s).
- Critical data-integrity bug (wheel picker saving wrong weight) fixed and re-verified.
- PWA: manifest + icon + network-first service worker (installable, offline-capable, non-stale).
- Remaining nice-to-haves (not blockers): richer chart tooltips, more achievement types, run editing (currently delete-only), onboarding illustrations. These are suitable targets for the recurring 15-min webDevReview cron.

---
Task ID: 5 (webDevReview cron — round 1)
Agent: main (Z.ai Code) — recurring 15-min review
Task: QA the current state, fix bugs, add features (run editing, personal records, more achievements), improve styling.

## Current project status assessment
- App is stable: all 7 views render with zero runtime errors, lint fully clean (exit 0), dev server healthy (all 200s).
- PWA (manifest + network-first SW) works; mobile nav has all 7 items; wheel-picker data-integrity bug was fixed in prior round.
- Identified gaps: (1) run editing was a stub ("Tính năng chỉnh sửa đang được phát triển" toast), (2) no "Personal Records" lifetime-bests showcase on dashboard, (3) only 14 achievements.

## Completed modifications & verification

### 1. Run editing (feature gap fix)
- **Store** (`src/store/rt-store.ts`): added `editRunId: string | null`, `startEditRun(id)`, `startNewRun()`, `clearEditRun()`. `startEditRun` sets both `editRunId` and `quickAdd:"run"` so the sheet opens in edit mode.
- **RunSheet** (`src/components/rt/quick-add/run-sheet.tsx`): added `editingRun` live query; when `editRunId` is set, loads the run's distance/duration/feeling/note/date into the form on open. Save now updates the existing run (preserves `id` + `createdAt`) instead of creating a new one. Title changes to "Sửa buổi chạy" with a Pencil icon; button changes to "Lưu thay đổi". Added an in-sheet "Xoá" button (destructive) with an animated confirm banner (AnimatePresence height animation) for delete-from-edit-mode. Reset `confirmDelete` on close.
- **Runs view** (`src/components/rt/views/runs-view.tsx`): wired the "Chỉnh sửa" dropdown item from the stub toast to `useRtStore.getState().startEditRun(run.id)`.
- **TopBar + dashboard + runs "Ghi chạy" buttons**: updated all `setQuickAdd("run")` calls to `startNewRun()` to ensure the "Ghi chạy" button always opens a fresh form (clears editRunId).
- **Verified via agent-browser**: opened edit sheet from runs timeline → confirmed run data loaded (5.2 km, 30 min) → changed distance via keyboard (ArrowRight) to 5.2 → saved → verified in IndexedDB that the run was **updated** (same ID, value changed from 5.0 to 5.2) not duplicated (count stayed 1).

### 2. Personal Records card (new dashboard feature)
- **Dashboard** (`src/components/rt/views/dashboard-view.tsx`): added `PersonalRecordsCard` component showing 4 lifetime bests in a responsive grid (2 cols mobile, 4 cols desktop):
  - Chạy dài nhất (longest run) — Route icon, teal accent
  - Nhịp nhanh nhất (fastest pace min/km) — Gauge icon, coral accent
  - Chuỗi dài nhất (best streak) — Flame icon, amber accent
  - Tổng calo (total calories) — Zap icon, violet accent
- Computed via `computePersonalRecords(runs)` using `bestStreakEver` from achievements lib. Each record tile has a colored icon chip, accent glow blob (intensifies on hover), CountUp animation, and unit label. Footer shows "Từ N buổi chạy — tiếp tục phá vỡ kỷ lục!" with a Crown icon.
- Fixed a rendering bug: string values (pace "5:46") now render directly without a spurious CountUp "0" alongside.
- Added a skeleton placeholder for the PR card in DashboardSkeleton.
- **Verified**: after scrolling into view, CountUp animated to correct values (5.20 km, 318 kcal, 1 ngày).

### 3. More achievements (gamification expansion)
- **Achievements** (`src/lib/rt/achievements.ts`): added 5 new defs (total now 19):
  - calories_1000 (silver) — "Đốt cháy 1.000 calo"
  - calories_5000 (gold) — "Lò lửa 5.000 calo"
  - consistency_week (bronze) — "Tuần đều đặn" (≥3 runs in one week)
  - streak_14 (gold) — "Thử thách 14 ngày"
  - pace_master (gold) — "Bậc thầy tốc độ" (≥12 km/h avg in a run)
- Added `getWeekKey` helper for the consistency check.
- **Verified**: achievements view now shows "2 / 19" with all 19 badge cards rendered.

### 4. Styling polish
- **globals.css**: added `.card-hover-lift` utility (translateY -2px + primary-tinted border + lift shadow on hover) and `.shimmer` skeleton animation utility.
- **SectionCard** (`src/components/rt/shared/section-card.tsx`): applied `card-hover-lift` class globally — all SectionCard-wrapped cards now have a premium hover lift effect across every view.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA: cycled all 7 views — zero console errors, zero runtime errors.
- Run edit flow: verified update-not-duplicate via IndexedDB inspection.
- PR card: verified CountUp animates to correct values on scroll-into-view.
- Achievements: verified 19 total badges render, 2 unlocked.

## Unresolved issues / risks & next-phase recommendations
- **CountUp inView timing**: the PR card's CountUp values animate only when scrolled into view (by design via `useInView`). On a long dashboard, values show 0 until scrolled to. This is acceptable (progressive reveal) but could be changed to `whenInView={false}` for immediate animation if preferred.
- **Run editing doesn't re-evaluate weight achievements**: editing a run updates run-based achievements correctly, but if a run edit somehow affected weight data (it doesn't currently), the weight achievement eval would need to run. Not a real risk now.
- **Next-phase ideas** (for the next 15-min review):
  1. Add a "Recent Activity" mixed feed (runs + weights) on the dashboard for a livelier first screen.
  2. Add run detail dialog (click a timeline entry to see full details + edit).
  3. Add monthly stats summary card.
  4. Add CSV export option alongside JSON.
  5. Add a "share" button for PR cards (copy to clipboard).
  6. Add more heatmap interactivity (click a day to see that day's runs).

---
Task ID: 6 (webDevReview cron — round 2)
Agent: main (Z.ai Code) — recurring 15-min review
Task: QA the current state, add features (Recent Activity feed, interactive heatmap), improve styling.

## Current project status assessment
- App remains stable: all 7 views render with zero runtime errors, lint fully clean (exit 0), dev server healthy (all 200s).
- Round 1 added: run editing, Personal Records card, 5 more achievements (19 total), card-hover-lift styling.
- This round's focus: (1) "Recent Activity" mixed feed on dashboard for a livelier first screen, (2) interactive heatmap with rich day-detail tooltip, (3) styling polish.

## Completed modifications & verification

### 1. Recent Activity feed (new dashboard feature)
- **Dashboard** (`src/components/rt/views/dashboard-view.tsx`): added `RecentActivityCard` — a unified chronological timeline merging runs + weight entries (newest first, limit 6). Features:
  - Vertical timeline with gradient line; each item has a gradient circular icon (grad-primary for runs with Footprints icon, grad-energy for weights with Scale icon), ring-4 ring-card for depth.
  - Run rows show distance (big), duration (Clock), calories (Flame), feeling emoji; weight rows show weight + diff chip vs previous entry (▲/▼ emerald/coral colored).
  - Relative time labels ("Vừa xong", "X phút trước", "Hôm qua", "N ngày trước", fallback to date).
  - Staggered framer-motion entrance (opacity + x slide), hover bg highlight, chevron-right indicator.
  - "Xem tất cả" action → setActiveView('runs').
  - Returns null when no activity (runs=0 and weights≤1) to avoid clutter on fresh profiles.
  - Added skeleton placeholder.
- Fixed a Rules-of-Hooks violation: moved `sortedWeights` useMemo before the early return.

### 2. Interactive heatmap (enhancement)
- **HeatmapCard** (`src/components/rt/views/dashboard-view.tsx`): upgraded from native `title` tooltips to a rich floating popover:
  - On cell hover: shows a positioned tooltip (AnimatePresence fade+scale) with the full date ("EEEE, d MMM yyyy"), run count + total km, and up to 3 run summaries (feeling emoji + distance + duration). For rest days: "Ngày nghỉ 🌿".
  - Tooltip auto-clamps to container width (stored in state to avoid ref-during-render lint).
  - Cells now have `hover:ring-2 hover:ring-primary/40` for visual focus + `cursor-default`.
  - Subtitle updated to "119 ngày gần nhất — di chuột để xem chi tiết".
  - Replaced `motion` import with `AnimatePresence, motion`; added `useRef, useState` imports.
  - Fixed `react-hooks/refs` lint error by storing container width in state (not reading ref during render).
- **Verified via agent-browser**: hovered over a rest-day cell → tooltip showed "Monday, 4 May 2026 · Ngày nghỉ 🌿". Hovered over cells correctly toggles the popover.

### 3. Styling polish
- Heatmap cells: added `hover:ring-2 hover:ring-primary/40` for premium focus state.
- Recent Activity rows: hover bg highlight (`hover:bg-muted/50`) + chevron translate-x on hover.
- All new cards use the existing `card-hover-lift` class from round 1.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA: cycled all 7 views — zero console errors, zero runtime errors.
- Recent Activity feed: verified renders with run (5km, 30m, 312 kcal, 😊) + weight (70kg) + relative time.
- Interactive heatmap: verified tooltip renders with date + run details on hover.

## Unresolved issues / risks & next-phase recommendations
- **Heatmap tooltip on touch devices**: the hover-based tooltip won't work on mobile (no hover). A tap-to-toggle variant would be needed for full mobile support. Low priority since the native title attr was removed; could add a tap handler.
- **Recent Activity click action**: currently the feed rows show a chevron but don't navigate. Could wire run rows to `startEditRun(run.id)` and weight rows to open the weight sheet. Next-phase enhancement.
- **Next-phase ideas** (for the next 15-min review):
  1. Wire Recent Activity run rows to open the edit sheet (click-to-edit).
  2. Add monthly stats summary card on dashboard.
  3. Add CSV export option alongside JSON in settings.
  4. Add a "share" button for PR cards (copy summary to clipboard).
  5. Add run detail dialog (click timeline entry in runs view to see full read-only details).
  6. Add tap-to-show heatmap tooltip for mobile.

---
Task ID: 7 (webDevReview cron — round 3)
Agent: main (Z.ai Code) — recurring 15-min review
Task: QA, wire Recent Activity rows to be clickable, add Monthly Stats summary card, styling polish.

## Current project status assessment
- App stable: all 7 views render with zero runtime errors, lint fully clean (exit 0), dev server healthy (all 200s).
- Round 2 added: Recent Activity feed, interactive heatmap with rich tooltip.
- This round's focus: (1) make Recent Activity rows clickable (run → edit sheet, weight → weight sheet), (2) add Monthly Stats summary card to dashboard.

## Completed modifications & verification

### 1. Clickable Recent Activity rows (feature completion)
- **Dashboard** (`src/components/rt/views/dashboard-view.tsx`): converted the Recent Activity feed rows from `motion.div` to `motion.button` with:
  - Run rows: `onClick={() => useRtStore.getState().startEditRun(item.run.id)}` — opens the run edit sheet.
  - Weight rows: `onClick={() => useRtStore.getState().setQuickAdd("weight")}` — opens the weight logging sheet.
  - Added `whileTap={{ scale: 0.98 }}` for tactile feedback, `cursor` implicit via button, `focus-visible:ring-2 focus-visible:ring-primary/40` for keyboard accessibility, `text-left` + `w-full` for proper button layout.
- **Verified via agent-browser**: clicked a run row in the Recent Activity feed → edit sheet ("Sửa buổi chạy") opened correctly with the run's data loaded.

### 2. Monthly Stats summary card (new dashboard feature)
- **Dashboard**: added `MonthlyStatsCard` showing 4 stats for the current month in a responsive grid (2 cols mobile, 4 cols desktop):
  - Tổng km (total km this month) — CountUp, primary gradient glow
  - Buổi chạy (run count) — CountUp, energy gradient glow
  - TB / buổi (avg distance per run) — CountUp, violet gradient glow
  - Vs tháng trước (vs last month %) — TrendingUp/Down icon + colored pct, with "mới" label when no prior-month data
- Computed via inline month filtering using `run.date.startsWith("YYYY-MM")` — no new date helpers needed. Uses Vietnamese month labels ("Tháng 8").
- Added skeleton placeholder (h-32) to DashboardSkeleton.
- **Verified**: after scrolling into view, CountUp animated to correct values (5,0 km, 1 buổi, 5,0 km avg, "mới").

### 3. Styling details
- Monthly Stats tiles: each has a colored gradient glow blob (primary/energy/violet/dynamic), consistent with the PR card design language.
- Activity rows: button element with focus-visible ring for accessibility + whileTap scale for tactile feedback.
- All new cards use `card-hover-lift` class (from round 1).

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA: cycled all 7 views — zero fresh console errors, zero runtime errors.
- Clickable activity rows: verified run row click opens edit sheet.
- Monthly Stats card: verified renders with correct values after scroll-into-view.

## Unresolved issues / risks & next-phase recommendations
- **CountUp inView timing**: Monthly Stats values show 0 until scrolled into view (by design). Acceptable progressive-reveal behavior.
- **Stale HMR parse error**: during editing, the browser console showed a transient "Parsing ecmascript source code failed" that cleared on recompile. Not a real issue — lint + fresh page load are clean.
- **Next-phase ideas** (for the next 15-min review):
  1. Add CSV export option alongside JSON in settings.
  2. Add a "share" button for PR cards (copy summary to clipboard).
  3. Add run detail dialog (click timeline entry in runs view to see full read-only details before editing).
  4. Add tap-to-show heatmap tooltip for mobile (currently hover-only).
  5. Add a "this week vs last week" mini comparison strip on the dashboard.
  6. Add profile-level streak goal tracking (e.g. "aim for 4 runs/week" with weekly compliance).

---
Task ID: 8 (webDevReview cron — round 4)
Agent: main (Z.ai Code) — recurring 15-min review
Task: QA, add CSV export (runs + weights), add share button for PR cards, styling polish.

## Current project status assessment
- App stable: all 7 views render with zero runtime errors, lint fully clean (exit 0), dev server healthy (all 200s).
- Prior rounds added: run editing, Personal Records card, 19 achievements, Recent Activity feed (clickable), interactive heatmap, Monthly Stats card.
- This round's focus: (1) CSV export for runs + weights (high-value for a local data app — lets users analyze in Excel/Sheets), (2) share button for PR cards (social/viral feature).

## Completed modifications & verification

### 1. CSV export (new feature)
- **exportImport.ts** (`src/lib/rt/exportImport.ts`): added 3 functions:
  - `csvCell(value)` — RFC 4180 escaping (quotes cells containing comma/quote/newline, doubles internal quotes).
  - `exportRunsCsv()` — builds CSV string of all runs across all profiles with a `profile` name column (joined from profiles table) + date/distanceKm/durationMin/avgSpeed/calories/feeling/note. Sorted by date then createdAt.
  - `exportWeightsCsv()` — builds CSV string of all weight entries with profile name + date/weightKg/note.
  - `downloadText(filename, text, mime)` — downloads a text blob with a UTF-8 BOM prefix (`\uFEFF`) so Excel reads Vietnamese diacritics correctly.
- **Settings view** (`src/components/rt/views/settings-view.tsx`): added a "Xuất CSV" subsection below the JSON export/import buttons with two outline buttons:
  - "Xuất buổi chạy (CSV)" — Footprints icon → `handleExportRunsCsv` → `exportRunsCsv()` + `downloadText('runtrack-runs-YYYYMMDD.csv', csv)`.
  - "Xuất cân nặng (CSV)" — Scale icon → `handleExportWeightsCsv` → `exportWeightsCsv()` + `downloadText('runtrack-weights-YYYYMMDD.csv', csv)`.
  - Section label with FileSpreadsheet icon: "Xuất CSV (mở bằng Excel / Google Sheets)".
  - Toast on success: "Đã xuất CSV buổi chạy · N dòng · mở được bằng Excel/Google Sheets".
- **Verified via agent-browser**: clicked "Xuất buổi chạy (CSV)" → toast "Đã xuất CSV buổi chạy · 1 dòng · mở được bằng Excel/Google Sheets". No errors.

### 2. Share button for PR cards (new feature)
- **Dashboard** (`src/components/rt/views/dashboard-view.tsx`): added a share button to the PersonalRecordsCard footer:
  - `handleShare()` builds a text summary: "🏃 RunTrack — Kỷ lục cá nhân" + 4 PRs (longest run, fastest pace, best streak, total calories) + "Từ N buổi chạy 💪".
  - Uses `navigator.share` if available (mobile native share sheet), falls back to `navigator.clipboard.writeText`.
  - Button shows "Chia sẻ" (Share2 icon) by default, switches to "Đã chép" (Check icon, emerald) for 2s after success.
  - Toast: "Đã sao chép kỷ lục! Dán vào nơi bạn muốn chia sẻ."
  - Button styled as a subtle pill (`border border-border/70 bg-card/60 hover:border-primary/40 hover:text-primary`).
- **Verified via agent-browser**: clicked share → toast "Đã sao chép kỷ lục! Dán vào nơi bạn muốn chia sẻ." Button works.

### 3. Styling details
- CSV section: labeled subheader with FileSpreadsheet icon, two outline buttons in a 2-col grid (sm+), consistent with the JSON button row above.
- Share button: pill-style with hover state transitioning border + text color to primary.
- PR card footer: changed from centered to `justify-between` layout to accommodate the share button on the right.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA: cycled all 7 views — zero console errors, zero runtime errors.
- CSV export: verified toast "Đã xuất CSV buổi chạy · 1 dòng · mở được bằng Excel/Google Sheets".
- Share button: verified toast "Đã sao chép kỷ lục! Dán vào nơi bạn muốn chia sẻ."

## Unresolved issues / risks & next-phase recommendations
- **Clipboard read permission**: couldn't programmatically verify clipboard content via agent-browser (readText requires permission), but the toast confirms writeText succeeded.
- **CSV includes all profiles**: the CSV exports join profile name, so multi-profile data is correctly attributed. No per-profile filtering yet — could add a profile filter dropdown if needed.
- **Next-phase ideas** (for the next 15-min review):
  1. Add run detail dialog (click timeline entry in runs view for full read-only details before editing).
  2. Add tap-to-show heatmap tooltip for mobile (currently hover-only).
  3. Add a "this week vs last week" mini comparison strip on the dashboard.
  4. Add profile-level streak goal tracking (e.g. "aim for 4 runs/week" with weekly compliance).
  5. Add a data-overview chart on settings (e.g. storage usage breakdown).
  6. Add keyboard shortcuts (e.g. "n" for new run, "w" for weight).

---
Task ID: 9 (webDevReview cron — round 5)
Agent: main (Z.ai Code) — recurring 15-min review
Task: QA, add Week-vs-Last-Week comparison strip, add keyboard shortcuts, styling polish.

## Current project status assessment
- App stable: all 7 views render with zero runtime errors, lint fully clean (exit 0), dev server healthy (all 200s).
- Prior rounds added: run editing, PR card + share, 19 achievements, Recent Activity feed (clickable), interactive heatmap, Monthly Stats card, CSV export.
- This round's focus: (1) "this week vs last week" mini comparison strip on the dashboard (high visual impact, uses existing run data), (2) global keyboard shortcuts (n/w/1-7) for power users, (3) shortcuts hint section in settings.

## Completed modifications & verification

### 1. Week vs Last Week comparison strip (new dashboard feature)
- **Dashboard** (`src/components/rt/views/dashboard-view.tsx`): added `WeekComparisonStrip` between the StatCardsGrid and the Heatmap. Features:
  - 3 metrics (Km, Buổi, Calo) each in its own card with a colored pct-change chip (▲/▼ emerald/rose) and two animated bars: "Tuần này" (grad-primary, brighter) vs "Tuần trước" (muted-foreground/30). Bars animate width via framer-motion `whileInView`.
  - Bar widths normalized to max of the two values (min 6% so zero isn't invisible).
  - SectionCard-style header with Activity icon, "Tuần này vs Tuần trước" title.
  - Computes inline using `currentWeekKeys()` + `weekKeysForOffset(1)` (added `currentWeekKeys` to dates import).
  - Added skeleton placeholder (h-24).
- **Verified via agent-browser**: after logging a run, strip showed Km (▲100%, 5km vs 0), Buổi (▲100%, 1 vs 0), Calo (▲100%, 312 vs 0).

### 2. Global keyboard shortcuts (new feature)
- **AppShell** (`src/components/rt/app-shell.tsx`): added a `useEffect` keydown listener with:
  - `n` → `startNewRun()` (opens new run sheet)
  - `w` → `setQuickAdd("weight")` (opens weight sheet)
  - `1`–`7` → `setActiveView` to dashboard/runs/weight/goals/compare/achievements/settings (matches nav order)
  - Guards: ignores when typing in INPUT/TEXTAREA/SELECT/contentEditable; ignores when a quickAdd sheet is already open (Esc handled by drawer).
- **Verified via agent-browser**: dispatched `keydown` events for `n`, `w`, `2`, `3` — all worked (n→run sheet, w→weight sheet, 2→Runs view, 3→Weight view).

### 3. Keyboard shortcuts hint section (settings)
- **Settings view** (`src/components/rt/views/settings-view.tsx`): added a "Phím tắt" SectionCard after the About card, listing all 4 shortcuts (N, W, 1–7, Esc) in a 2-col grid with `<kbd>`-styled key chips (mono font, border, shadow-soft).
- **Verified**: section renders with all 4 shortcuts + key chips.

### 4. Styling details
- Week strip cards: `border border-border/60 bg-card/60` consistent with PR/Monthly cards; animated bars with gradient fill.
- Shortcuts: `<kbd>` elements with `rounded-lg border border-border bg-muted font-mono shadow-soft` for a premium key-cap look.
- pct-change chips: emerald for up, rose for down, muted for same — consistent with the app's semantic color language.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA: cycled all 7 views — zero console errors, zero runtime errors.
- Week strip: verified renders with correct values (▲100% on all 3 metrics after first run).
- Keyboard shortcuts: verified n/w/2/3 all trigger correct actions.
- Settings shortcuts section: verified renders with all 4 key chips.

## Unresolved issues / risks & next-phase recommendations
- **Shortcuts on mobile**: keyboard shortcuts are desktop-focused; mobile users use the nav + buttons. The settings hint is still useful context. No action needed.
- **Week strip on fresh profiles**: shows ▲100% for all metrics (since last week is 0). Could show "—" instead when both weeks are 0, but the current behavior (encouraging ▲) is acceptable for a fitness app.
- **Next-phase ideas** (for the next 15-min review):
  1. Add run detail dialog (click timeline entry in runs view for full read-only details before editing).
  2. Add tap-to-show heatmap tooltip for mobile (currently hover-only).
  3. Add profile-level streak goal tracking (e.g. "aim for 4 runs/week" with weekly compliance).
  4. Add a data-overview chart on settings (e.g. storage usage breakdown by table).
  5. Add a "this day last year" nostalgic card if data exists.
  6. Add export of a single profile's data (currently CSV/JSON exports all profiles).

---
Task ID: 10 (webDevReview cron — round 6)
Agent: main (Z.ai Code) — recurring 15-min review
Task: QA, add run detail dialog (click timeline entry), add tap-to-show heatmap tooltip for mobile, styling polish.

## Current project status assessment
- App stable: all 7 views render with zero runtime errors, lint fully clean (exit 0), dev server healthy (all 200s).
- Prior rounds added: run editing, PR card + share, 19 achievements, Recent Activity (clickable), interactive heatmap (hover), Monthly Stats, CSV export, Week-vs-Last-Week strip, keyboard shortcuts.
- This round's focus: (1) run detail dialog (click timeline entry in runs view for full read-only details → edit), (2) tap-to-show heatmap tooltip for mobile (previously hover-only).

## Completed modifications & verification

### 1. Run detail dialog (new feature)
- **Runs view** (`src/components/rt/views/runs-view.tsx`): added `RunDetailDialog` component + `detailRun` state:
  - Timeline entries converted from passive `motion.div` to clickable (`onClick={() => setDetailRun(run)}`, `role="button"`, `tabIndex={0}`, Enter/Space keyboard activation, `cursor-pointer`, `focus-visible:ring-2`).
  - DropdownMenu wrapped in a `stopPropagation` div so the ⋯ menu doesn't trigger the detail dialog.
  - Dialog content: gradient hero header (mint gradient, blurred glow blobs) showing date ("EEEE, d MMMM yyyy") + big distance + summary line (duration · pace · calories); 2-col stats grid with 6 colored icon chips (Quãng đường, Thời gian, Nhịp TB, Tốc độ TB, Calo đốt cháy, Cảm giác); dashed-border note block with MapPin icon; Đóng/Chỉnh sửa action buttons.
  - "Chỉnh sửa" button closes the dialog and opens the run edit sheet via `startEditRun`.
  - Added Dialog imports + MapPin/Heart/Zap lucide icons.
- **Verified via agent-browser**: clicked a timeline entry → dialog opened showing "Sunday, 30 August 2026", 5,00 km hero, all 6 stats, feeling "😊 Khá tốt". Clicked "Chỉnh sửa" → dialog closed + edit sheet ("Sửa buổi chạy") opened.

### 2. Tap-to-show heatmap tooltip for mobile (enhancement)
- **Dashboard** (`src/components/rt/views/dashboard-view.tsx`): added `handleTap` to the heatmap cells:
  - `onClick={(e) => handleTap(cell, e)}` on each cell, with `e.stopPropagation()` so the container's `onMouseLeave` dismiss doesn't fire immediately.
  - Tap-to-toggle: tapping a cell shows the tooltip; tapping the same cell again dismisses it; tapping another cell repositions.
  - Subtitle updated to "119 ngày gần nhất — di chuột hoặc chạm để xem".
  - Removed `cursor-default` (now clickable).
- **Verified via agent-browser**: clicked a colored cell → tooltip "Monday, 4 May 2026 · Ngày nghỉ 🌿" appeared. Clicked the same cell again → tooltip dismissed (toggled off).

### 3. Styling details
- Run detail dialog: premium gradient hero header with blurred accent blobs, 2-col stat tiles with colored icon chips matching the app's brand palette (teal/cyan/coral/amber/violet/rose), dashed note block with MapPin accent.
- Heatmap cells: now clickable on all devices (hover on desktop, tap on mobile) — unified interaction model.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA: cycled all 7 views — zero console errors, zero runtime errors.
- Run detail dialog: verified opens with full stats + note, "Chỉnh sửa" navigates to edit sheet.
- Tap-to-show heatmap: verified tap shows tooltip, second tap toggles off.

## Unresolved issues / risks & next-phase recommendations
- **Click-outside dismiss for tap tooltip**: tapping outside the heatmap container currently relies on the existing `onMouseLeave` (which won't fire on touch). A tap elsewhere on the page won't dismiss the tooltip — only tapping the same cell or hovering away does. Low priority; the toggle behavior covers the main use case.
- **Next-phase ideas** (for the next 15-min review):
  1. Add profile-level streak goal tracking (e.g. "aim for 4 runs/week" with weekly compliance ring).
  2. Add a data-overview chart on settings (storage usage breakdown by table).
  3. Add a "this day last year" nostalgic card if data exists.
  4. Add export of a single profile's data (currently CSV/JSON exports all profiles).
  5. Add a weekly distance goal mini-celebration when the week's km goal is hit.
  6. Add run route/notes search/filter in the runs view timeline.

---
Task ID: 11 (webDevReview cron — round 7)
Agent: main (Z.ai Code) — recurring 15-min review
Task: QA, add runs timeline search + feeling filter, styling polish.

## Current project status assessment
- App stable: all 7 views render with zero runtime errors, lint fully clean (exit 0), dev server healthy (all 200s).
- Prior rounds added: run editing, PR card + share, 19 achievements, Recent Activity (clickable), interactive heatmap (hover+tap), Monthly Stats, CSV export, Week-vs-Last-Week strip, keyboard shortcuts, run detail dialog.
- This round's focus: runs timeline search/filter (high practical value for users with many runs — search by note/date/distance/duration/feeling + filter by feeling).

## Completed modifications & verification

### 1. Runs timeline search + feeling filter (new feature)
- **Runs view** (`src/components/rt/views/runs-view.tsx`): added search + feeling filter to the timeline:
  - New state: `search` (string), `feelingFilter` (Feeling | null).
  - `filteredRuns` memo: applies feeling filter + full-text search across a haystack of [note, date, formatted date, distance+unit, raw km, duration, calories, feeling label, feeling emoji]. Case-insensitive.
  - `timelineItems` now derives from `filteredRuns` instead of `sortedRuns`.
  - UI: search input with Search icon prefix + clear (X) button; feeling filter chips row (5 feelings + "Xoá lọc" when active). Active chip styled `bg-primary/10 text-primary`.
  - Subtitle updates to show filtered count ("N buổi · mới nhất trước").
  - Empty state when filters produce no results: "🔍 Không tìm thấy buổi chạy nào" with "Xoá tất cả bộ lọc" button that clears both search + feeling.
  - Imported `Input` from shadcn, `Search`/`X` from lucide, `cn` from utils.
- **Verified via agent-browser**:
  - Typed "999" → subtitle "0 buổi", run hidden, empty state shown.
  - Cleared search → run reappeared.
  - Clicked "Tuyệt vời" filter → 0 results (run was "Khá tốt").
  - "Xoá tất cả bộ lọc" → cleared both, run reappeared ("1 buổi").

### 2. Styling details
- Search input: `h-10 pl-9 pr-9` with absolutely-positioned Search icon (left) and clear X button (right, appears only when search has text).
- Feeling chips: pill-style with emoji + label; active state `bg-primary/10 text-primary`; inactive `border-border text-muted-foreground hover:bg-muted`.
- Empty state: dashed border, large emoji, "Xoá tất cả bộ lọc" outline button — consistent with the app's existing empty-state design language.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA: cycled all 7 views — zero console errors, zero runtime errors.
- Search: verified typing "999" filters out the run, empty state appears, clear restores.
- Feeling filter: verified "Tuyệt vời" filters out the "Khá tốt" run; "Xoá tất cả bộ lọc" restores.

## Unresolved issues / risks & next-phase recommendations
- **Search haystack includes formatted date**: searching "30" matches "30/8" date. This is intended (users may search by day number) but could match more than expected. Acceptable.
- **Next-phase ideas** (for the next 15-min review):
  1. Add profile-level streak goal tracking (e.g. "aim for 4 runs/week" with weekly compliance ring).
  2. Add a data-overview chart on settings (storage usage breakdown by table).
  3. Add a "this day last year" nostalgic card if data exists.
  4. Add export of a single profile's data (currently CSV/JSON exports all profiles).
  5. Add a weekly distance goal mini-celebration when the week's km goal is hit.
  6. Add date-range filter to the runs timeline (e.g. "last 30 days", "this month").

---
Task ID: 12 (webDevReview cron — round 8)
Agent: main (Z.ai Code) — recurring 15-min review
Task: QA, add weekly km goal mini-celebration, add data/storage overview card to settings, styling polish.

## Current project status assessment
- App stable: all 7 views render with zero runtime errors, lint fully clean (exit 0), dev server healthy (all 200s).
- Prior rounds added: run editing, PR card + share, 19 achievements, Recent Activity (clickable), interactive heatmap (hover+tap), Monthly Stats, CSV export, Week-vs-Last-Week strip, keyboard shortcuts, run detail dialog, runs search/filter.
- This round's focus: (1) weekly km goal mini-celebration (motivational, fires special confetti when week's km goal is first hit), (2) data/storage overview card on settings (shows IndexedDB usage breakdown).

## Completed modifications & verification

### 1. Weekly km goal mini-celebration (new feature)
- **RunSheet** (`src/components/rt/quick-add/run-sheet.tsx`): after saving a new run, checks if the week's total km crossed the `profile.targetKmPerWeek` threshold for the first time this week (weekKmBeforeThisRun < target && weekKm >= target). If so, queues a special `__weekly_goal__` celebration with a 2.6s delay (so achievement celebrations show first). Only fires on new runs (not edits).
- **CelebrationModal** (`src/components/rt/shared/celebration-modal.tsx`): refactored to handle the special `__weekly_goal__` type alongside normal achievements. Weekly goal variant: amber accent (var(--brand-amber)), 🏆 emoji, "Mục tiêu tuần" badge, "Đạt mục tiêu tuần!" title, "Bạn đã hoàn thành mục tiêu km của tuần này. Quá đỉnh!" description, extra confetti (130 particles vs 90, warm color palette with white).
- **Verified via agent-browser**: created a profile with 5 km/week goal, logged a 5 km run → "Bước chân đầu tiên" + "Cột mốc 5K" + "Đạt mục tiêu tuần" achievements fired, then the custom weekly goal celebration ("🏆 Mục tiêu tuần · Đạt mục tiêu tuần!") fired with the amber styling.

### 2. Data/storage overview card (new settings feature)
- **exportImport.ts** (`src/lib/rt/exportImport.ts`): added `estimateStorage()` — serializes each table to JSON and measures Blob size, returns per-table + total bytes.
- **Settings view** (`src/components/rt/views/settings-view.tsx`): added `StorageOverview` component in the Data section (below DataStatsRow):
  - Stacked horizontal bar showing the proportion of each table (profiles=teal, runs=coral, weights=violet, achievements=amber) with `title` tooltips.
  - 2-col legend grid with colored dots + per-table byte sizes (prettySize).
  - Total size shown in the header ("Dung lượng dữ liệu · 987 B").
  - Returns null when total is 0 (fresh install).
  - Added `useEffect` import.
- **Verified via agent-browser**: storage overview rendered showing "987 B" total, breakdown: Hồ sơ 178 B, Buổi chạy 222 B, Cân nặng 158 B, Thành tích 429 B.

### 3. Styling details
- Weekly goal celebration: warm amber palette (gold/orange/white confetti) distinct from the achievement mint/teal palette — visually signals "goal" vs "badge".
- Storage overview: stacked bar with brand-colored segments matching each table's semantic color; legend with colored dots; consistent with the app's data-visualization design language.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA: cycled all 7 views — zero console errors, zero runtime errors.
- Weekly goal celebration: verified the full chain (achievement celebrations → custom weekly goal celebration with amber styling) fired after a goal-hitting run.
- Storage overview: verified renders with correct per-table byte sizes and total.

## Unresolved issues / risks & next-phase recommendations
- **Storage estimate is approximate**: `estimateStorage` measures JSON serialization size, not actual IndexedDB disk usage (which has overhead). The displayed values are a lower bound. Acceptable for a relative breakdown display.
- **Weekly goal celebration only fires once per threshold crossing**: if a user edits a run and the week's km drops below then re-crosses the goal, the celebration won't refire (edit path is excluded). Intended behavior to avoid spam.
- **Next-phase ideas** (for the next 15-min review):
  1. Add profile-level streak goal tracking (e.g. "aim for 4 runs/week" with weekly compliance ring).
  2. Add a "this day last year" nostalgic card if data exists.
  3. Add export of a single profile's data (currently CSV/JSON exports all profiles).
  4. Add date-range filter to the runs timeline (e.g. "last 30 days", "this month").
  5. Add a "first run anniversary" celebration.
  6. Add a weight-goal-reached celebration (mirror of the weekly km goal celebration).

---
Task ID: 13 (webDevReview cron — round 9)
Agent: main (Z.ai Code) — recurring 15-min review
Task: QA, add weight-goal-reached celebration, add date-range filter to runs timeline, styling polish.

## Current project status assessment
- App stable: all 7 views render with zero runtime errors, lint fully clean (exit 0), dev server healthy (all 200s).
- Prior rounds added: run editing, PR card + share, 19 achievements, Recent Activity (clickable), interactive heatmap (hover+tap), Monthly Stats, CSV export, Week-vs-Last-Week strip, keyboard shortcuts, run detail dialog, runs search/feeling filter, weekly km goal celebration, storage overview.
- This round's focus: (1) weight-goal-reached celebration (mirrors the weekly km goal celebration — fires when user reaches target weight), (2) date-range filter for the runs timeline (Tất cả/7 ngày/30 ngày/Tháng này).

## Completed modifications & verification

### 1. Weight-goal-reached celebration (new feature)
- **WeightSheet** (`src/components/rt/quick-add/weight-sheet.tsx`): after saving a weight entry, detects if the new weight crossed the target threshold for the first time. Handles both losing (target < prevWeight, fires when newWeight <= target) and gaining (target > prevWeight, fires when newWeight >= target) goals. Queues a `__weight_goal__` celebration with a 2.6s delay (after achievement celebrations).
- **CelebrationModal** (`src/components/rt/shared/celebration-modal.tsx`): added `WEIGHT_GOAL` definition (⚖️ emoji, teal accent, "Đạt cân nặng mục tiêu!" title, "Bạn đã chạm đến con số mình hướng tới. Tuyệt vời!" description). Refactored the special-type resolution to handle both `__weekly_goal__` and `__weight_goal__` via a `special` variable. Weight-goal confetti uses a teal/mint/white palette (130 particles).
- **Verified via agent-browser**: created a profile (70 kg → target 69 kg), logged a 68.5 kg weight → "Khởi đầu giảm cân" achievement fired, then the weight-goal celebration ("⚖️ Mục tiêu cân nặng · Đạt cân nặng mục tiêu!") fired with teal styling.

### 2. Date-range filter for runs timeline (new feature)
- **Runs view** (`src/components/rt/views/runs-view.tsx`): added `dateRange` state ("all" | "7" | "30" | "month"), integrated into `filteredRuns` via a computed `cutoff` date (YYYY-MM-DD). "7" = last 7 days, "30" = last 30 days, "month" = current calendar month (1st to today).
- UI: a "THỜI GIAN:" labeled row of 4 chips (Tất cả, 7 ngày, 30 ngày, Tháng này) below the feeling filter chips. Active chip styled `bg-primary/10 text-primary`.
- "Xoá tất cả bộ lọc" empty-state button now resets dateRange to "all" too. Empty-state condition includes `dateRange !== "all"`.
- **Verified via agent-browser**: the date-range filter chips render ("THỜI GIAN: Tất cả · 7 ngày · 30 ngày · Tháng này"); clicking "7 ngày" correctly shows the run (saved today, within 7 days).

### 3. Styling details
- Weight-goal celebration: teal/mint palette (distinct from weekly goal's amber and achievements' mixed tiers) — visually signals "weight milestone".
- Date-range filter: labeled chip row consistent with the feeling filter design language; "THỜI GIAN:" label in muted uppercase.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA: cycled all 7 views — zero console errors, zero runtime errors.
- Weight-goal celebration: verified full chain (Khởi đầu giảm cân achievement → weight-goal celebration with teal styling) fired after a goal-reaching weight entry.
- Date-range filter: verified chips render and "7 ngày" correctly includes today's run.

## Unresolved issues / risks & next-phase recommendations
- **Weight-goal celebration fires once per crossing**: if a user's weight oscillates around the target (e.g. 69 → 68 → 69 → 68), the celebration only fires on the first crossing (prevWeight > target && newWeight <= target). Subsequent re-crossings after going back above won't refire. Intended to avoid spam.
- **Date-range "month" uses calendar month**: "Tháng này" filters from the 1st of the current month, not a rolling 30 days. This matches the Monthly Stats card's definition. Acceptable.
- **Next-phase ideas** (for the next 15-min review):
  1. Add profile-level streak goal tracking (e.g. "aim for 4 runs/week" with weekly compliance ring).
  2. Add a "this day last year" nostalgic card if data exists.
  3. Add export of a single profile's data (currently CSV/JSON exports all profiles).
  4. Add a "first run anniversary" celebration.
  5. Add a weight trend prediction line on the weight chart (projected to goal date).
  6. Add a "favorite runs" starring feature for highlighting memorable sessions.

---
Task ID: 14 (webDevReview cron — round 10)
Agent: main (Z.ai Code) — recurring 15-min review
Task: QA, add weight trend prediction line on the weight chart, styling polish.

## Current project status assessment
- App stable: all 7 views render with zero runtime errors, lint fully clean (exit 0), dev server healthy (all 200s).
- Prior rounds added: run editing, PR card + share, 19 achievements, Recent Activity (clickable), interactive heatmap (hover+tap), Monthly Stats, CSV export, Week-vs-Last-Week strip, keyboard shortcuts, run detail dialog, runs search/feeling/date-range filter, weekly km goal celebration, storage overview, weight-goal celebration.
- This round's focus: weight trend prediction line on the weight chart (premium analytics — projects the trend to the goal date using the recent rate of change).

## Completed modifications & verification

### 1. Weight trend prediction line (new feature)
- **Weight view** (`src/components/rt/views/weight-view.tsx`): added a dashed violet `Line` on the weight AreaChart that projects from the latest actual weight toward the target weight, using the average rate of change (kg/day) from the first to latest entry:
  - `predictionData` memo: computes the rate, checks it's moving toward the target (losing when target<current, gaining when target>current), generates weekly projected points up to the estimated goal date (capped at 365 days), with a final point exactly at the goal date.
  - `mergedData` memo: merges actual chart data (`actualWeight` key) with prediction points (`predictedWeight` key), including a bridge point at the latest actual date so the dashed line connects smoothly from the last real measurement.
  - The Area now uses `dataKey="actualWeight"` (real data, gradient fill); the Line uses `dataKey="predictedWeight"` (dashed violet, no fill, no dots).
  - Tooltip updated to handle both actual and predicted points — predicted points show a "DỰ ĐOÁN" (prediction) badge in violet and skip the diff chip.
  - Legend gains a "Dự đoán" entry (dashed violet swatch) when prediction data exists.
  - Imported `Line` from recharts.
  - Moved `predictionData` + `mergedData` memos before the early-return guards (Rules-of-Hooks compliance) with safe fallbacks for `sorted`/`profile`.
- **Verified via agent-browser**: created a profile (70 kg → target 65 kg), logged a 68 kg entry → weight chart shows the "Dự đoán" legend + dashed violet prediction line projecting toward the target date. No errors.

### 2. Styling details
- Prediction line: dashed violet (`var(--brand-violet)`, strokeWidth 2, dasharray "5 5") — distinct from the actual teal area and the coral target reference line. Three visually distinct line styles on one chart (solid teal area, dashed violet prediction, dashed coral target).
- Tooltip "DỰ ĐOÁN" badge: violet-tinted chip, 9px bold uppercase — clearly labels projected points.
- Legend: conditional "Dự đoán" entry only shown when prediction data exists (avoids clutter for fresh profiles).

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA: cycled all 7 views — zero console errors, zero runtime errors.
- Prediction line: verified renders with "Dự đoán" legend + projected data points (1/9 date, trending 68→69→target) after a 2-entry downward trend.

## Unresolved issues / risks & next-phase recommendations
- **Prediction accuracy**: the projection uses a simple linear rate from first to latest entry. Real weight loss/gain is non-linear, so the predicted goal date is a rough estimate. Acceptable for a motivational visualization (not a medical forecast).
- **Prediction only shows with ≥2 entries**: requires at least 2 weight entries to compute a rate. Single-entry profiles show no prediction (correct behavior).
- **Prediction hidden when moving away from target**: if the user's trend is going away from the target (e.g. gaining when they should lose), no prediction line is drawn. Correct — avoids demotivating projections.
- **Next-phase ideas** (for the next 15-min review):
  1. Add profile-level streak goal tracking (e.g. "aim for 4 runs/week" with weekly compliance ring).
  2. Add a "this day last year" nostalgic card if data exists.
  3. Add export of a single profile's data (currently CSV/JSON exports all profiles).
  4. Add a "first run anniversary" celebration.
  5. Add a "favorite runs" starring feature for highlighting memorable sessions.
  6. Add a confidence band (shaded range) around the prediction line to convey uncertainty.

---
Task ID: 15 (user-requested feature — Journey Memories / photos)
Agent: main (Z.ai Code)
Task: Add photo memories for runs — attach photos to runs, gallery "Kỷ niệm hành trình" on dashboard, lightbox viewer, export/import photos.

## Completed modifications & verification

### 1. Data layer — photos table
- **types.ts**: added `RunPhoto` interface `{ id, runId, profileId, dataUrl, createdAt }`.
- **db.ts**: bumped to version 2 with a new `photos` table (indexes: runId, profileId, createdAt, compound [profileId+createdAt], [runId+createdAt]). Added `fileToCompressedDataUrl(file, maxDim=1280, quality=0.8)` helper that resizes + compresses images to base64 JPEG via canvas (keeps storage small, supports Vietnamese diacritics in EXIF-free form).

### 2. Run sheet — photo picker
- **run-sheet.tsx**: added photo upload UI:
  - "📷 Ảnh kỉ niệm" section with a hidden file input (accept image/*, multiple).
  - "Thêm ảnh kỉ niệm" dashed button → triggers file picker; compresses each image (max 1280px, q0.8), max 8 at a time / 12 total.
  - 3-col thumbnail grid with hover X-to-delete; loading spinner during compression.
  - On edit: loads existing photos from db; on save: persists new photos, deletes removed ones; on run delete: cascades photo deletion.
  - Added `Camera`, `ImagePlus`, `X`, `Loader2` lucide imports + `fileToCompressedDataUrl` + `RunPhoto` type.

### 3. Run detail dialog — photo gallery
- **runs-view.tsx**: added `RunDetailPhotos` component shown in the run detail dialog:
  - "Ảnh kỉ niệm (N)" header + 3-col thumbnail grid.
  - Click a thumbnail → full-screen lightbox with prev/next navigation + counter ("1 / N").
  - Spring-animated image transitions, click-outside-to-close, backdrop blur.
  - Added `Camera` import + `AnimatePresence` import.

### 4. Dashboard — "Kỷ niệm hành trình" card + full gallery
- **dashboard-view.tsx**: added `JourneyMemoriesCard` + `JourneyGallery`:
  - Card: 6 most-recent photos in a 3-col (mobile) / 6-col (desktop) grid; hover reveals run distance + date caption; "Xem tất cả" opens full gallery.
  - Gallery: full-screen overlay with a masonry-style columns layout (2/3/4 cols responsive); each photo shows run caption on hover; click → lightbox with prev/next + counter + run caption pill.
  - Card returns null when no photos (keeps dashboard clean for fresh profiles).
  - Added `Images`, `Camera`, `X` lucide imports + `RunPhoto` type.

### 5. Export/Import — photos included
- **exportImport.ts**: `ExportBundle` now includes `photos?: RunPhoto[]`; `exportAll` fetches photos; `importBundle` clears + restores photos in the transaction. `estimateStorage` includes photos in the breakdown.
- **settings-view.tsx**: `StorageOverview` now shows an "Ảnh kỉ niệm" segment (mint color) in the stacked bar + legend.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA:
  - Run sheet: "Thêm ảnh kỉ niệm" button present; uploaded a test PNG → thumbnail appeared → saved run → verified photo persisted in IndexedDB (1 photo).
  - Dashboard: "Kỷ niệm hành trình" card rendered ("1 ảnh · mỗi bức là một câu chuyện") with the photo + run caption ("5.0 km · 31/...").
  - Gallery: "Xem tấtả" opened full-screen gallery showing 1 image, no errors.
  - All 7 views cycled — zero console errors, zero runtime errors.

## Notes
- Photos are stored as compressed base64 JPEG (max 1280px, q0.8) in IndexedDB — a typical phone photo compresses to ~100-300 KB, so 12 photos/run × many runs is manageable locally.
- The run-sheet photo state tracks both existing (from DB, with id) and new (pending) photos; the save logic diff-persists correctly.
- Run deletion cascades to photos (no orphaned images).
- The journey card only appears when photos exist — fresh profiles see a clean dashboard.

---
Task ID: 16 (user-requested — 4 new features in progress)
Agent: main (Z.ai Code)
Task: Add progress photos (before/after), story timeline, on-this-day memory, monthly AI recap.

Work in progress — data layer + nav + API done:
- types.ts: added `ProgressPhoto` interface + `ViewId` now includes "progress" | "journey".
- db.ts: v3 with `progressPhotos` table (indexes: profileId, date, createdAt, compound [profileId+date], [profileId+createdAt]).
- exportImport.ts: ExportBundle includes progressPhotos; exportAll/importBundle/estimateStorage handle them.
- settings StorageOverview: now shows 6 segments including "Ảnh tiến bộ" (cyan).
- bottom-nav: now 9 items (added Tiến bộ/Camera + Hành trình/BookOpen after Cân nặng).
- app-shell: registered progress + journey views; keyboard shortcuts updated to 1-9 for the new nav order.
- API route /api/rt/recap: POST endpoint using z-ai-web-dev-sdk LLM to generate a personalized monthly recap (headline + narrative + highlights JSON). Falls back gracefully on error.
- Stubs: progress-view.tsx + journey-view.tsx created.

Next: build the 4 views/features.

---
Task ID: P4
Agent: general-purpose (Journey view)
Task: Build Journey/story timeline view (unified chronological feed of runs+weights+photos+progress+achievements, filter chips, lightbox, empty state).

Work Log:
- Read worklog.md (Task 16 entry) + types.ts, db.ts, utils.ts, dates.ts, achievements.ts, rt-store.ts, app-shell.tsx, existing journey-view stub, and runs-view/weight-view/achievements-view/dashboard-view for styling conventions.
- Overwrote /home/z/my-project/src/components/rt/views/journey-view.tsx with a complete premium timeline view (~900 lines).
- Data layer: 6 typed `useLiveQuery<T[]>` calls (runs, weights, photos, progressPhotos, achievements, profile), each guarded by `activeProfileId` and returning `T[]`.
- Unified feed: built via `useMemo` — each run/weight/progress/achievement becomes one entry; each run-photo creates one "photo" entry with the parent run attached for the caption. Entries sorted newest-first by `createdAt`/`unlockedAt`.
- Weight diff: weights sorted ascending by `createdAt`; each entry stores `weightDiff = current - previous` (kg); rendered as a ▲/▼ colored chip (green for loss, rose for gain, muted for unchanged).
- Run-photo grouping: `photosByRun` Map<string, RunPhoto[]> drives thumbnail grid (up to 4 thumbs) on run entries; clicking a thumb or full photo opens the lightbox with a "{distance} · {date}" caption.
- Achievement entries: `defForType(type)` for emoji+title+tier; `TIER_STYLE` for the tier ring/glow on the badge.
- Per-kind rendering: run (gradient avatar emoji + big distance + 4 chips + note + thumbs + "Sao chép tóm tắt"); weight (big value + ▲/▼ diff chip + note + copy); photo (full image + caption pill); progress (image + "Ảnh tiến bộ" label + weight pill at that time); achievement (emoji badge + title + tier label + "Đã mở khoá" + date).
- Timeline rail: each entry has `relative pl-11 sm:pl-14` with an absolute gradient vertical line (`from-primary/40 via-primary/10 to-transparent`) and a circular `grad-primary`/`grad-energy` icon badge with `ring-2 ring-background` so the line passes cleanly behind it.
- Date header: "Hôm nay" / "Hôm qua" / "d MMM yyyy" + relative time ("vừa xong" / "X phút trước" / "X giờ trước" / "X ngày trước" / "X tuần trước" / "X tháng trước" / "X năm trước").
- Filter chips: Tất cả / Chạy / Cân nặng / Ảnh / Thành tích — pill buttons with `grad-primary` active state. "Ảnh" filter covers both run-photos and progress photos.
- Header summary: total entries ("{N} mục") + date range ("Từ d/M/yyyy đến d/M/yyyy"), both as pills.
- Loading skeleton, empty state (📖 "Hành trình của bạn bắt đầu đây" + action button → `setActiveView("dashboard")`), and filter-empty fallback state.
- Lightbox: full-screen `bg-black/90 backdrop-blur`, spring-scaled image, click-outside-to-close, X button + caption pill; click on image `stopPropagation` so it stays open.
- Animations: framer-motion staggered `whileInView` reveals with `delay={i*0.05}` (capped at 0.6s), `viewport={{once:true, margin:"-8% 0px"}}`, premium ease `[0.22,1,0.36,1]`.
- Bonus interactions: per-run/weight "Sao chép tóm tắt" button copies a shareable text to clipboard via `navigator.clipboard` and fires `toast.success("Đã sao chép tóm tắt")`.
- Verification: `bun run lint` → exit 0, clean. `npx tsc --noEmit` → zero errors in journey-view.tsx (pre-existing errors in dashboard-view.tsx, exportImport.ts, examples/, skills/ are unrelated).

Stage Summary:
- File written: /home/z/my-project/src/components/rt/views/journey-view.tsx (~900 lines, single default export `JourneyView`).
- All 8 design requirements met: loading guard, unified timeline, per-kind content cards, filter chips, empty state, lightbox, header summary, whileInView progressive reveal.
- No modifications to src/lib/, src/store/, or src/components/rt/shared/ — only journey-view.tsx touched.
- Lint + TypeScript clean for the file. Ready for QA.

---
Task ID: P2
Agent: general-purpose (Progress view)
Task: Build Progress photos view (before/after slider, logging drawer, timeline grid, lightbox, empty state, stats).

Work Log:
- Read worklog.md (Task 16 entry) + types.ts, db.ts, utils.ts, dates.ts, rt-store.ts, app-shell.tsx, existing progress-view stub, journey-view/runs-view/weight-view/quick-add sheets for styling & hook conventions.
- Verified lucide-react@0.525.0 exports; `ImageCompare` does NOT exist in this version, used `SplitSquareHorizontal` as the visual substitute (with a code comment noting the substitution).
- Overwrote /home/z/my-project/src/components/rt/views/progress-view.tsx with a complete premium progress-photos view (~1236 lines, single default export `ProgressView`).
- Data layer: two typed `useLiveQuery` calls — `useLiveQuery<ProgressPhoto[]>` (progressPhotos by profileId) and `useLiveQuery<Profile | undefined>` (active profile). Both guarded by `activeProfileId`.
- Loading guard: `ProgressSkeleton` (animated-pulse hero + comparison + stats + grid placeholders) returned when `photos` or `profile` is undefined.
- Empty state (0 photos): `EmptyState` with emoji 📸, title "Chưa có ảnh tiến độ", Vietnamese text matching the spec, and a grad-primary action button that opens the logging drawer. TipsCard is shown alongside to help the user start.
- Logging drawer (`ProgressDrawer`, vaul Drawer): hidden file input (`accept="image/*" capture="environment"`), preview area with X-to-remove + Loader2 spinner during compression, date picker (default today, max today), optional weight input (auto-filled from `profile.currentWeight` converted via `kgToLb` when imperial), optional note textarea, save button (grad-primary). On save: `fileToCompressedDataUrl(file, 1280, 0.8)` already produced the preview, so we just `db.progressPhotos.put(entry)` with `uid()` + `Date.now()`; weight is parsed via `parseWeightInput` back to canonical kg. Toast success on save, drawer closes, form resets on next open via useEffect.
- Before/after comparison slider (`CompareSlider`, HERO feature): `aspect-[4/3]` container with `touch-none select-none`, the "after" image as base layer (right side), the "before" image overlaid with `style={{ clipPath: inset(0 ${100-pct}% 0 0) }}` so it reveals the left `pct`%. Pointer events (`onPointerDown/Move/Up/Cancel`) on the container drive `pct` (0-100) with `setPointerCapture` for smooth dragging. A vertical white divider line at `left: ${pct}%` with a circular glassmorphism grabber (`SplitSquareHorizontal` icon). Top-left and top-right labels show "TRƯỚC/SAU" badges + date + weight pills. Hidden range input (0-100, 0.5 step) at the bottom for accessibility — opacity-0, hover-to-reveal. The parent passes `key={before.id-after.id}` so the slider remounts (and `pct` resets to 50) whenever the chosen photos change, avoiding setState-in-effect.
- Photo pickers: two shadcn `Select` dropdowns for "Ảnh trước" and "Ảnh sau", each listing all photos sorted oldest-first with date + weight labels. The opposite selection is `disabled` in each list to prevent same-photo comparison. A "Tự chọn đầu · cuối" button resets to first/last; an "Đảo chiều" button swaps before/after using the effective IDs (works even before the user has touched the dropdowns, because before/after are derived values).
- Effective-ID derivation: instead of `useEffect` calling `setState` (which fails the `react-hooks/set-state-in-effect` rule), I compute `effectiveBeforeId`/`effectiveAfterId` via `useMemo` — they fall back to `sortedAsc[0].id`/`sortedAsc[last].id` whenever the user's selection is empty, missing, or equal. The Selects are bound to the effective IDs while `onValueChange` writes to the raw state. This keeps the UI always valid without cascading renders.
- Fallback when only 1 photo: a dashed-border prompt card ("Cần thêm một ảnh nữa") with a "Thêm ảnh" button that opens the logging drawer.
- Timeline grid (`SectionCard` "Dòng thời gian"): 3-col mobile / 4-col sm / 5-col lg of `aspect-square` thumbnails, newest first. Each thumbnail is a `motion.button` with `whileInView` reveal (staggered delay capped at 0.4s), `object-cover` image, dark gradient overlay, bottom-left date pill (d/M format) + bottom-right weight pill (when weightKg is defined), top-right Trash2 button (opacity-0 → group-hover:opacity-100) that opens the AlertDialog for delete confirmation.
- Delete confirmation: shadcn `AlertDialog` with title "Xoá ảnh tiến độ?", description showing the photo's date label, Huỷ + Xoá (rose-colored) actions. On confirm: `db.progressPhotos.delete(target.id)`, toast success, close lightbox if open.
- Lightbox (`Lightbox`): full-screen `bg-black/85 backdrop-blur`, spring-scaled image, click-outside-to-close, X button (top-right), Trash2 button (top-left, opens the AlertDialog), prev/next chevron buttons (ArrowLeft/ArrowRight icons), bottom caption strip with date pill + weight pill + "Ảnh tiến độ" badge + optional note + "i / N · Dùng ← → để chuyển ảnh" counter. Keyboard nav (Escape closes, ArrowLeft/Right cycles) via a window keydown listener in a `useEffect` placed BEFORE any early return (rules-of-hooks safe).
- Stats row (`StatsRow`, only when ≥2 photos): 4 `StatTile`s in a 2x2 / 4x1 grid — Số ngày (days between first & last via `differenceInCalendarDays`), Thay đổi cân nặng (signed diff in display unit, emerald if negative/lost, coral if positive/gained, "—" if either photo lacks weightKg), Số ảnh (count), Trung bình (avg interval = days / (count-1)). Each tile is a `rounded-3xl border bg-card shadow-soft` card with a primary-tinted icon chip.
- Tips card (`TipsCard`): `SectionCard` with Lightbulb icon, 3 `Tip` items in a 1/3-col grid — 🕐 Cùng giờ trong ngày, 💡 Cùng ánh sáng, 📷 Cùng góc & tư thế — each a `rounded-2xl border bg-muted/40` row with emoji chip + bold title + muted description.
- Header: full-width `grad-primary` hero card with decorative blob glows, "Ảnh tiến bộ" eyebrow, "Hành trình thay đổi" title, photo-count subtitle, and a white/translucent "Chụp ảnh tiến độ" Camera button (opens logging drawer).
- Animations: framer-motion `initial={{opacity:0,y:16}}` / `whileInView={{opacity:1,y:0}}` entrances with `viewport={{once:true,margin:"-6% 0px"}}` and the premium ease `[0.22,1,0.36,1]`. AnimatePresence wraps the Lightbox for smooth exit. Spring transition on the lightbox image (`stiffness:240, damping:22`).
- Verification: `bun run lint` → exit 0, fully clean (3 initial errors fixed: replaced setState-in-effect for before/after defaults with derived `useMemo` IDs; replaced setState-in-effect for slider reset with parent `key` remount; moved Lightbox `useEffect` ahead of the early return to satisfy rules-of-hooks). `npx tsc --noEmit` → zero errors in progress-view.tsx (pre-existing errors in dashboard-view.tsx, exportImport.ts, examples/, skills/ are unrelated).

Stage Summary:
- File written: /home/z/my-project/src/components/rt/views/progress-view.tsx (~1236 lines, single default export `ProgressView`).
- All 7 design requirements met: loading guard, photo logging drawer (with file input + date + weight + note + compression), before/after comparison slider (pointer-drag + range input + Select pickers + swap/auto-pick buttons), timeline grid (3/4/5 cols + per-thumb delete), empty state with action, lightbox with prev/next + keyboard nav + delete, stats row (days + weight change + count + avg interval), tips card.
- No modifications to src/lib/, src/store/, or src/components/rt/shared/ — only progress-view.tsx touched.
- Lint + TypeScript clean for the file. Ready for QA.

---
Task ID: 16 (user-requested — 4 new features COMPLETE)
Agent: main (Z.ai Code)
Task: Add progress photos (before/after), story timeline, on-this-day memory, monthly AI recap — all 4 features.

## Completed modifications & verification

### 1. Progress photos view (before/after slider)
- Built by subagent (Task P2). File: `progress-view.tsx` (~1236 lines).
- Before/after draggable comparison slider (clip-path based, pointer-drag), logging drawer with camera capture, timeline grid with delete, lightbox, stats row, tips card, empty state.

### 2. On-this-day memory card (dashboard)
- Built by main agent in `dashboard-view.tsx`. `OnThisDayCard` checks for entries (runs/weights/photos) from exactly 1 year, 6 months, and 1 month ago. Shows a nostalgic "Đúng ngày này..." card with the most recent memory found: run km, weight at that time, photo thumbnails. Returns null when no memories (clean dashboard for fresh profiles).

### 3. Story/Journey timeline view
- Built by subagent (Task P4). File: `journey-view.tsx` (~900 lines).
- Unified chronological feed merging runs + weights + run-photos + progress-photos + achievements. Per-kind content cards with left rail + gradient icon badges. Filter chips (Tất cả/Chạy/Cân nặng/Ảnh/Thành tích). Lightbox. Empty state. Header summary with date range.

### 4. Monthly AI recap modal (LLM-powered)
- Built by main agent in `dashboard-view.tsx` + API route `/api/rt/recap`.
- `MonthlyRecapModal`: full-screen modal with gradient hero header, auto-playing photo slideshow (3s interval, pause/play, dots), stats strip (km/buổi/calo), and an **AI-generated narrative** via the LLM API route.
- API route (`/api/rt/recap/route.ts`): POST endpoint using `z-ai-web-dev-sdk` LLM. Sends the month's stats (km, runs, calories, longest run, streak, weight change, goals, photos count) and receives a JSON `{ headline, narrative, highlights }` — a personalized Spotify-Wrapped-style story. Falls back gracefully on error.
- "AI Recap" button added to the MonthlyStatsCard header.
- **Verified via agent-browser**: clicked "AI Recap" → modal opened → LLM generated "🏃‍♂️ Mỗi bước đi đều là tiến bộ!" headline + narrative "Tháng 8 này, Full đã hoàn thành 5km chạy bộ..." Works end-to-end.

### Bug fixes during integration
- Fixed `useEffect` not imported in dashboard-view (caused client-side crash when opening recap modal).
- Fixed empty `anyOf([])` guard in monthPhotos query (Dexie throws on empty array).

### Nav + infrastructure
- BottomNav: now 9 items (added Tiến bro/Camera + Hành trình/BookOpen).
- AppShell: registered progress + journey views; keyboard shortcuts updated to 1-9.
- Types: added `ProgressPhoto`, `ViewId` includes "progress" | "journey".
- DB: v3 with `progressPhotos` table.
- Export/Import: handles progressPhotos; StorageOverview shows 6 segments.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s, no compile errors.
- agent-browser QA: cycled all 9 views — zero fresh console errors, zero runtime errors.
- AI Recap: verified LLM generates personalized narrative end-to-end.
- Progress view: verified empty state renders.
- Journey view: verified 4-entry timeline (run + weight + 2 achievements) with filters.
- On-this-day: returns null for fresh profiles (no 1-year-old data yet).

## Notes
- The AI recap requires internet (to call the LLM API) — the only non-local feature. Falls back gracefully if offline. All other features remain fully local.
- Progress photos use the same compression (1280px, q0.8) as run photos.
- The before/after slider uses clip-path + pointer-drag — works on both desktop and mobile.

---
Task ID: 17 (user-requested — AI food logging + gọn nav)
Agent: main (Z.ai Code)
Task: AI food logging (parse natural language → calo/macro), AI meal plan, gọn nav (hamburger), bỏ So sánh, gọn dashboard.

## Completed modifications & verification

### 1. Data layer — meals table + AI APIs
- types.ts: added `MealEntry` interface + `MealSlot` type. `ViewId` now: dashboard/runs/weight/nutrition/progress/journey/goals/achievements/settings (removed "compare", added "nutrition").
- db.ts: v4 with `meals` table (indexes: profileId, date, slot, createdAt, compound [profileId+date], [profileId+createdAt]).
- API route `/api/rt/food` (POST): LLM parses natural-language meal description → JSON `{ slot, items[], totals }`. Splits "khoai trứng rau" into 3 món, estimates Vietnamese portion sizes.
- API route `/api/rt/meal-plan` (POST): LLM generates a personalized 1-day meal plan (Sáng/Trưa/Tối/Phụ) based on weight, target, running goal, avg burned. Returns targets (cal/protein/carbs/fat) + meal suggestions + a tip.
- store: `quickAdd` now includes "meal"; `setQuickAdd` accepts "meal".

### 2. Nav — hamburger drawer (gọn hơn)
- bottom-nav.tsx: completely rewritten. Mobile: top bar with hamburger (☰) → drawer slides in from left with all 9 views (icon + label + description). Desktop: slim 64px icon-only side rail with hover tooltips. Removed "So sánh". Added "Dinh dưỡng".
- app-shell.tsx: registered nutrition view; removed compare from views map; keyboard shortcuts 1-9 updated for new order; added "f" → meal sheet. Main content gets `pt-16` on mobile (for the fixed top bar).
- top-bar.tsx: hidden on mobile (replaced by hamburger bar); added "Ghi bữa ăn" (Utensils icon) button alongside weight + run on desktop.

### 3. Meal logging sheet + Nutrition view
- meal-sheet.tsx: Drawer with free-text textarea ("sáng ăn khoai lang, 2 quả trứng, rau"), date picker, "AI tính calo & macro" button → calls /api/rt/food → shows parsed result (slot chip, 4 macro tiles: Calo/Protein/Carbs/Fat with colored icons, items list with name+amount+calories, save button). Saves to db.meals.
- nutrition-view.tsx: full view with:
  - Header + "Ghi bữa ăn" button.
  - Today summary card: 4 macro tiles + energy balance (nạp vs đốt from running avg/day).
  - AI Meal Plan card: "Tạo thực đơn" button → generates targets + 4 meal suggestions + tip.
  - Today's meals by slot (with macro chips per item).
  - History list (all meals, compact rows).
  - Empty state with CTA.
  - Delete confirm dialog.

### 4. Dashboard — gọn hơn
- Removed the standalone WeekComparisonStrip (redundant with stat cards).
- Grouped cards into 2-col grids: PR + Monthly Stats side-by-side; Journey Memories + On-this-day side-by-side. Dashboard now ~5 main blocks instead of 9 stacked.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s.
- agent-browser QA:
  - Created profile, logged a run.
  - Nutrition view: "Ghi bữa ăn" → entered "sáng nay tôi ăn 1 củ khoai lang luộc, 2 quả trứng chiên, 1 bát rau muống xào" → AI parsed: Sáng slot, 361 kcal, 17g protein, 48g carbs, 12g fat, 3 items (khoai lang 170kcal, trứng 156kcal, rau 35kcal). Saved → today summary showed correct totals.
  - AI Meal Plan: generated 1700 kcal target, 112g protein, 170g carbs, 56g fat + meal suggestions (Sáng: trứng+khoai+rau, Trưa: ức gà+cơm gạo lứt, Tối: cá kho+rau+½ cơm) + tip.
  - Nav: hamburger drawer works on mobile; desktop rail works.
  - Cycled all 9 views — zero console errors, zero runtime errors.

## Note on email login
- User asked about email login. The app is 100% local (IndexedDB). Email login requires backend + real DB (auth, API, sync) — a large architecture change. Currently NOT implemented; awaiting user decision (A: profile password local-only, B: full backend with email auth + sync).

---
Task ID: 18 (user-requested — GPS live run + Story Locket + full app)
Agent: main (Z.ai Code)
Task: Add GPS live-run mode (real-time tracking), Locket-style stories, map polyline on run detail, wire everything.

## Completed modifications & verification

### 1. GPS Live Run mode (real-time tracking)
- **gps.ts** (`src/lib/rt/gps.ts`): new utilities — `haversineMeters`, `traceDistanceMeters/Km`, `simplifyTrace` (decimation), `traceBounds`, `traceToSvgPath` (projects lat/lng into an SVG viewBox with aspect-ratio preservation).
- **types.ts**: added optional `trace?: { lat, lng, t }[]` to `RunSession` for storing the GPS polyline.
- **store**: added `liveRunOpen`, `setLiveRunOpen`, `startLiveRun`.
- **live-run-overlay.tsx**: full-screen overlay with:
  - Idle screen: "Sẵn sàng chạy?" + "Bắt đầu chạy" button.
  - Running: `navigator.geolocation.watchPosition` (high accuracy) → accumulates points (filters <4m jitter), big live distance (km, 2 decimal), time, pace (min/km), speed (km/h), mini SVG map drawing the trace in real-time with gradient polyline + start dot.
  - Pause/resume (tracks paused time so duration excludes pauses).
  - Finish: feeling selector + optional note + save → creates RunSession with `trace` (simplified) → achievements eval → toast.
  - Permission denied handling with helpful message.
- **Verified via agent-browser**: opened overlay → "Sẵn sàng chạy?" rendered correctly.

### 2. Story (Locket-style)
- **types.ts**: added `Story` interface + "stories" to ViewId.
- **db.ts**: v5 with `stories` table.
- **store**: added `storyComposerOpen`, `setStoryComposerOpen`, `startStoryCapture`.
- **story-composer.tsx**: full-screen modal → pick/capture photo (compress 1080px q0.82) → preview with caption input (gradient overlay) → "Đăng story".
- **stories-view.tsx**: full view with:
  - Empty state: "Chưa có story nào" + CTA.
  - Story ring (horizontal): "Thêm" tile + circular thumbnails.
  - Grid (2-3 cols): story cards with caption overlay + delete.
  - **StoryViewer**: full-screen Locket-style auto-advance (5s each), progress bars at top, pause/play, tap left/right to navigate, keyboard (Esc/←/→/Space), spring-scaled image transitions, caption pill at bottom.
- **Verified**: empty state + view renders correctly.

### 3. Map polyline on run detail
- **runs-view.tsx**: RunDetailDialog now shows a "Tuyến đường GPS (N điểm)" section with an SVG map (gradient polyline) when the run has a trace. Uses `traceToSvgPath` from gps lib.

### 4. Nav + wiring
- **bottom-nav**: added "Story" item (Sparkles icon) + Live Run button (Radio, grad-energy) in mobile top bar + desktop side rail.
- **top-bar**: added Live Run (Radio) + Story capture (Sparkles) + Meal (Utensils) + Weight (Scale) + Run (Plus) buttons on desktop.
- **app-shell**: registered stories view + mounted LiveRunOverlay + StoryComposer. Keyboard shortcuts: l→live run, s→story capture, 1-9→views.
- **exportImport**: handles meals + stories in export/import/estimateStorage.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s.
- agent-browser QA: cycled all 10 views — zero console errors, zero runtime errors.
- Live Run overlay: verified "Sẵn sàng chạy?" screen.
- Story view: verified empty state renders.

## Note on email/sharing
- Story + GPS are local-only (no sharing with a group — that needs a server). User confirmed hướng A.

---
Task ID: 19 (user-requested — full backend + auth + Locket groups)
Agent: main (Z.ai Code)
Task: Add real backend (Prisma + SQLite), NextAuth email login, Locket-style group sharing.

## Completed modifications & verification

### 1. Backend (Prisma + SQLite)
- **prisma/schema.prisma**: full rewrite with User (email, passwordHash, avatarColor), Account/Session/VerificationToken (NextAuth), Group (name, inviteCode), GroupMember (role: owner/member), SharedStory (caption, dataUrl, author).
- `bun run db:push` → database synced.
- `bcryptjs` installed for password hashing.

### 2. NextAuth (email + password)
- **src/lib/auth.ts**: authOptions with Credentials provider (bcrypt compare), JWT session, callbacks to attach uid to token/session.
- **src/app/api/auth/[...nextauth]/route.ts**: NextAuth handler (GET + POST).
- **.env**: added NEXTAUTH_SECRET + NEXTAUTH_URL.
- **src/components/rt/providers.tsx**: client wrapper for SessionProvider (fixes "React Context unavailable in Server Components" error).

### 3. API routes
- **/api/signup**: POST — creates user with hashed password (bcrypt), validates email uniqueness + password length ≥6.
- **/api/groups**: GET — lists user's groups + members; POST — creates group with 6-char invite code (user = owner).
- **/api/groups/join**: POST — joins group by invite code.
- **/api/groups/stories**: GET — fetches group's shared stories (last 48h); POST — posts shared story (max ~1MB); DELETE — deletes own story.

### 4. Frontend auth
- **src/app/page.tsx**: auth gate — uses `useSession()` → if not logged in, shows `<AuthGate/>`; if logged in, shows normal app flow (onboarding → AppShell).
- **src/components/rt/auth/auth-gate.tsx**: beautiful login/signup screen with mode toggle (animated layoutId tab), email/password inputs, optional name + avatar color picker (signup), loading states, error toasts.

### 5. Locket view (group sharing)
- **src/components/rt/views/locket-view.tsx**: full view with:
  - Group tabs (horizontal scroll), invite code (copyable), member chips (avatar + name + OWNER badge).
  - "Chia sẻ khoảnh khắc" button → compose modal (camera capture → caption → post to group).
  - Shared stories grid (2-3 cols, author avatar + caption overlay, delete own stories).
  - Full-screen Locket viewer (auto-advance via keyboard, spring transitions, author pill).
  - Create/Join group modals (name input / invite code input).
  - Refresh button for polling.

### 6. Settings — account section
- Added "Tài khoản" section with email display + "Đăng xuất" button (signOut from next-auth/react).

### 7. Nav
- BottomNav: added "Nhóm" (Users icon) + "locket" ViewId.
- AppShell: registered locket view.

## Verification results
- `bun run lint` → exit 0, fully clean.
- Dev server: all 200s (after fixing SessionProvider Context error with client wrapper).
- agent-browser QA:
  - Auth gate: rendered login/signup toggle, email/password inputs.
  - Signed up "test@example.com" / "test123" → toast "Tài khoản đã tạo 🎉" → page reloaded → onboarding showed.
  - Created profile "Backend" → went to "Nhóm" view → "Chưa có nhóm nào" empty state.
  - Created group "CLB Chạy A" → group showed with invite code "L2BTRW", 1 member (Test User, OWNER).
  - Cycled all 11 views — zero console errors, zero runtime errors.

## Architecture notes
- **Local data** (runs, weights, meals, progress photos, local stories) stays in IndexedDB — private.
- **Server data** (user accounts, groups, shared stories) in Prisma/SQLite — for sharing.
- Shared stories are compressed photos uploaded to server; group members fetch them via API.
- Auth uses JWT sessions (no server session storage needed beyond what NextAuth manages).
- The app works offline for all local features; only auth + group sharing need internet.
