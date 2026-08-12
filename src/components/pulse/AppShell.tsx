import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { AppDataProvider } from "@/lib/app-context";
import { ParallaxScene, PulseLoader } from "@/components/pulse/illo/Scene";

/** Session gate + shared data provider for every signed-in Pulse screen. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <ParallaxScene className="min-h-screen">
        <div className="grid min-h-screen place-items-center">
          <PulseLoader label={loading ? "Waking Pulse up…" : "Taking you to sign in…"} />
        </div>
      </ParallaxScene>
    );
  }

  return <AppDataProvider user={user}>{children}</AppDataProvider>;
}
