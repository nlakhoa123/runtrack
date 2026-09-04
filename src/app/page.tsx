"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/lib/rt/db";
import { useRtStore } from "@/store/rt-store";
import { useMounted } from "@/hooks/use-mounted";
import { AuthGate } from "@/components/rt/auth/auth-gate";
import { Onboarding } from "@/components/rt/onboarding/onboarding";
import { AppShell } from "@/components/rt/app-shell";

export default function Page() {
  const mounted = useMounted();
  const { data: session, status } = useSession();
  const { activeProfileId, onboarded, setActiveProfile } = useRtStore();
  const profiles = useLiveQuery(() => db.profiles.orderBy("createdAt").toArray(), []);

  // register service worker for PWA/offline
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Ensure active profile still exists; otherwise reset to picker
  useEffect(() => {
    if (profiles && activeProfileId && !profiles.some((p) => p.id === activeProfileId)) {
      setActiveProfile(null);
    }
  }, [profiles, activeProfileId, setActiveProfile]);

  if (!mounted || status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-10 w-10 animate-pulse rounded-2xl grad-primary" />
      </div>
    );
  }

  // Not logged in → show auth gate
  if (!session?.user) {
    return <AuthGate />;
  }

  const hasProfiles = (profiles?.length ?? 0) > 0;
  const showOnboarding = !onboarded || !activeProfileId || !hasProfiles;

  return showOnboarding ? <Onboarding /> : <AppShell />;
}
