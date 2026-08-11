import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, getSettings, updateSettings } from "@/lib/api";
import type { Profile, UserSettings } from "@/lib/types";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { supabase } from "@/integrations/supabase/client";

type AppContextValue = {
  user: User;
  profile: Profile | null;
  settings: UserSettings | null;
  loading: boolean;
  saveSettings: (patch: Partial<UserSettings>) => Promise<void>;
  refreshProfile: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppDataProvider({ user, children }: { user: User; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [resolvedDark, setResolvedDark] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile", user.id],
    queryFn: () => getProfile(user.id),
    retry: 1,
  });

  const settingsQuery = useQuery({
    queryKey: ["settings", user.id],
    queryFn: () => getSettings(user.id),
    retry: 1,
  });

  const settings = settingsQuery.data ?? null;
  usePresenceHeartbeat(user.id, settings?.show_online ?? true);

  // Theme
  useEffect(() => {
    const theme = settings?.theme ?? "system";
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
      setResolvedDark(dark);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings?.theme]);

  // Wallpaper class on <body>
  useEffect(() => {
    const wp = settings?.wallpaper ?? "aurora";
    const classes = ["wp-aurora", "wp-plain", "wp-mint", "wp-dusk"];
    document.body.classList.remove(...classes);
    document.body.classList.add(`wp-${wp}`);
  }, [settings?.wallpaper]);

  // Keep my profile in sync across tabs/devices
  useEffect(() => {
    const channel = supabase
      .channel(`profile-self:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["profile", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, queryClient]);

  const saveSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      const next = await updateSettings(user.id, patch);
      queryClient.setQueryData(["settings", user.id], next);
    },
    [user.id, queryClient],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      profile: profileQuery.data ?? null,
      settings,
      loading: profileQuery.isLoading || settingsQuery.isLoading,
      saveSettings,
      refreshProfile: () => queryClient.invalidateQueries({ queryKey: ["profile", user.id] }),
    }),
    [user, profileQuery.data, profileQuery.isLoading, settings, settingsQuery.isLoading, saveSettings, queryClient],
  );

  void resolvedDark;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppDataProvider");
  return ctx;
}
