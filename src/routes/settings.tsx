import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pulse/AppShell";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { useApp } from "@/lib/app-context";
import {
  deleteMyAccount,
  exportMyAccount,
  getProfilesByIds,
  listBlocked,
  setBlocked,
} from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { UserSettings } from "@/lib/types";
import { PageBackground } from "@/components/pulse/PageBackground";

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
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

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
    <div className="relative min-h-screen">
      <PageBackground />
      <div className="mx-auto w-full max-w-2xl pb-16">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/8 bg-background/82 px-2 pb-4 pt-5 backdrop-blur-2xl md:px-4">
          <Link
            to="/profile"
            aria-label="Back to profile"
            className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/10 bg-white/[0.035] press hover:bg-white/[0.07]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-brand">
              PULSE / CONTROL
            </p>
            <h1 className="font-display text-[28px] font-semibold tracking-[-0.06em]">Settings</h1>
          </div>
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

        <Section title="Account">
          <div className="space-y-3 p-3">
            <p className="text-sm text-muted-foreground">
              Manage your sign-in details and keep a copy of your Pulse data.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder="New email address"
                className="h-10 min-w-0 flex-1 rounded-[12px] border border-white/10 bg-white/[0.035] px-3 text-sm outline-none transition-colors focus:border-brand/60"
              />
              <button
                type="button"
                disabled={!newEmail.trim()}
                onClick={() =>
                  void supabase.auth
                    .updateUser({ email: newEmail.trim() })
                    .then(({ error }) =>
                      error
                        ? toast.error(error.message)
                        : toast.success("Check your new email to confirm the change"),
                    )
                }
                className="grid h-10 w-10 place-items-center rounded-[12px] bg-brand text-brand-foreground press disabled:opacity-50"
                aria-label="Change email"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                minLength={8}
                className="h-10 min-w-0 flex-1 rounded-[12px] border border-white/10 bg-white/[0.035] px-3 text-sm outline-none transition-colors focus:border-brand/60"
              />
              <button
                type="button"
                disabled={newPassword.length < 8}
                onClick={() =>
                  void supabase.auth
                    .updateUser({ password: newPassword })
                    .then(({ error }) =>
                      error
                        ? toast.error(error.message)
                        : (setNewPassword(""), toast.success("Password updated")),
                    )
                }
                className="grid h-10 w-10 place-items-center rounded-[12px] border border-white/10 press disabled:opacity-50"
                aria-label="Change password"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void exportMyAccount()
                    .then((data) => {
                      const blob = new Blob([JSON.stringify(data, null, 2)], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(blob);
                      const anchor = document.createElement("a");
                      anchor.href = url;
                      anchor.download = "pulse-account-export.json";
                      anchor.click();
                      URL.revokeObjectURL(url);
                      toast.success("Account export downloaded");
                    })
                    .catch(() => toast.error("Couldn't export your account"))
                }
                className="inline-flex items-center gap-2 rounded-[11px] border border-white/10 px-3 py-2 text-xs font-semibold press hover:bg-white/[0.07]"
              >
                <Download className="h-3.5 w-3.5" /> Export data
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    !window.confirm("Delete your Pulse account permanently? This cannot be undone.")
                  )
                    return;
                  void deleteMyAccount()
                    .then(() => {
                      window.location.href = "/auth";
                    })
                    .catch(() => toast.error("Couldn't delete your account"));
                }}
                className="inline-flex items-center gap-2 rounded-[11px] border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive press hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete account
              </button>
            </div>
          </div>
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
                    className="rounded-[10px] border border-white/10 px-3 py-1.5 text-xs font-semibold press hover:bg-white/[0.07]"
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
    <section className="px-4 pt-7 md:px-5">
      <h2 className="pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {title}
      </h2>
      <div className="rounded-[20px] border border-white/10 bg-white/[0.025] p-2">{children}</div>
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
              "rounded-[10px] border px-3 py-1.5 text-xs font-semibold capitalize press",
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
