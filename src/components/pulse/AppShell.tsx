import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { AppDataProvider } from "@/lib/app-context";
import { CallProvider } from "@/lib/calls/CallProvider";
import { PageBackground } from "@/components/pulse/PageBackground";

/** Session gate + shared data provider for every signed-in Pulse screen. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="app-frame relative grid min-h-screen place-items-center overflow-hidden">
        <PageBackground />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="relative grid h-16 w-16 place-items-center rounded-[22px] border border-brand/30 bg-brand/10">
            <span className="h-3 w-3 rounded-full bg-brand shadow-[0_0_28px_rgb(190_240_148_/_0.9)] animate-signal" />
          </div>
          <p className="text-sm text-muted-foreground">
            {loading ? "Waking Pulse up…" : "Taking you to sign in…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-frame">
      <AppDataProvider user={user}>
        <CallProvider>{children}</CallProvider>
      </AppDataProvider>
    </div>
  );
}
