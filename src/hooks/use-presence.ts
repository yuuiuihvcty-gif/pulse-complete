import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Keeps the signed-in user's presence fresh and marks them offline on exit. */
export function usePresenceHeartbeat(userId?: string, showOnline = true) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const set = async (online: boolean) => {
      if (cancelled) return;
      await supabase
        .from("profiles")
        .update({ is_online: online && showOnline, last_seen: new Date().toISOString() })
        .eq("id", userId);
    };

    void set(true);
    const interval = window.setInterval(() => void set(true), 45000);
    const onVisibility = () => void set(document.visibilityState === "visible");
    const onLeave = () => void set(false);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
      void supabase
        .from("profiles")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("id", userId);
    };
  }, [userId, showOnline]);
}
