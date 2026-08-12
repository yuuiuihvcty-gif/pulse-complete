import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pulse/AppShell";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { useApp } from "@/lib/app-context";
import { getProfilesByIds, listBlocked, setBlocked } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { UserSettings } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Pulse, The Living Messenger" },
      {
        name: "description",
        content: "Theme, wallpaper, notifications and privacy controls for your Pulse account.",
      },
      { property: "og:title", content: "Settings — Pulse" },
      {
        property: "og:description",
        content: "Theme, wallpaper, notifications and privacy controls for your Pulse account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});

const THEMES = ["light", "dark", "system"] as const;
const WALLPAPERS = ["aurora", "plain", "mint", "dusk"] as const;

function SettingsPage() {
  const { user, settings, saveSettings } = useApp();
  const queryClient = useQueryClient();

  const blocked = useQuery({
    queryKey: ["blocked", user.id],
    queryFn: async () => {
      const ids = await listBlocked(user.id);
      return getProfilesByIds(ids);
    },
  });

  const set = (patch: Partial<UserSettings>) => {
    void saveSettings(patch).catch(() => toast.error("Couldn't save that setting"));
  };

  const toggle = (key: keyof UserSettings, label: string) => (
    <Toggle
      key={key}
      label={label}
      checked={Boolean(settings?.[key])}
      onChange={(v) => set({ [key]: v } as Partial<UserSettings>)}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl pb-16">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface/85 px-2 pb-3 pt-4 backdrop-blur-xl">
          <Link
            to="/profile"
            aria-label="Back to profile"
            className="grid h-10 w-10 place-items-center rounded-full press hover:bg-surface-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Settings</h1>
        </header>

        <Section title="Appearance">
          <Choice
            label="Theme"
            options={THEMES}
            value={settings?.theme ?? "system"}
            onChange={(v) => set({ theme: v as UserSettings["theme"] })}
          />
          <Choice
            label="Chat wallpaper"
            options={WALLPAPERS}
            value={settings?.wallpaper ?? "aurora"}
            onChange={(v) => set({ wallpaper: v })}
          />
        </Section>

        <Section title="Chatting">
          {toggle("enter_to_send", "Enter sends the message")}
          {toggle("media_autodownload", "Auto-download media")}
        </Section>

        <Section title="Notifications">
          {toggle("notif_messages", "Message notifications")}
          {toggle("notif_sound", "Sound")}
          {toggle("notif_vibrate", "Vibrate")}
        </Section>

        <Section title="Privacy">
          {toggle("show_online", "Show when I'm online")}
          {toggle("show_last_seen", "Show my last seen")}
          {toggle("read_receipts", "Send read receipts")}
        </Section>

        <Section title="Blocked people">
          {blocked.data && blocked.data.length > 0 ? (
            <ul className="space-y-1">
              {blocked.data.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl p-2">
                  <PulseAvatar profile={p} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.display_name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      void setBlocked(user.id, p.id, false)
                        .then(() => {
                          toast.success("Unblocked");
                          void queryClient.invalidateQueries({ queryKey: ["blocked", user.id] });
                        })
                        .catch(() => toast.error("Couldn't unblock"))
                    }
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold press hover:bg-surface-2"
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 py-2 text-sm text-muted-foreground">You haven't blocked anyone.</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 pt-6">
      <h2 className="pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="rounded-3xl border border-border bg-surface p-2">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm press hover:bg-surface-2"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="px-3 py-3">
      <p className="pb-2 text-sm">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize press",
              value === o
                ? "border-brand bg-brand-soft text-foreground"
                : "border-border bg-surface-2 text-muted-foreground",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
