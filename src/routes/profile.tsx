import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Camera, LogOut, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pulse/AppShell";
import { BottomNav, SideRail } from "@/components/pulse/Navigation";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { useApp } from "@/lib/app-context";
import { updateProfile } from "@/lib/api";
import { uploadMedia, validateFile } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";
import { MOODS } from "@/lib/types";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PageBackground } from "@/components/pulse/PageBackground";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Pulse, The Living Messenger" },
      {
        name: "description",
        content: "Edit your Pulse identity: photo, display name, about and the mood you're in.",
      },
      { property: "og:title", content: "Your profile — Pulse" },
      {
        property: "og:description",
        content: "Edit your Pulse identity: photo, display name, about and the mood you're in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <ProfilePage />
    </AppShell>
  ),
});

function ProfilePage() {
  const { user, profile, refreshProfile } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [about, setAbout] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setAbout(profile.about ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => updateProfile(user.id, patch),
    onSuccess: () => {
      refreshProfile();
      toast.success("Profile updated");
    },
    onError: () => toast.error("Couldn't save your profile"),
  });

  const dirty =
    !!profile &&
    (displayName.trim() !== (profile.display_name ?? "") ||
      about !== (profile.about ?? "") ||
      phone !== (profile.phone ?? ""));

  const onPickPhoto = async (file: File) => {
    const problem = validateFile(file, "Photo");
    if (problem) {
      toast.error(problem);
      return;
    }

    try {
      const path = await uploadMedia(user.id, file, file.name);
      await save.mutateAsync({ avatar_url: path });
    } catch {
      toast.error("Photo upload failed");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="relative min-h-screen md:flex">
      <PageBackground />
      <SideRail />
      <div className="mx-auto w-full max-w-2xl pb-28 md:pb-10">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.07] bg-[#050608]/82 px-4 pb-4 pt-5 backdrop-blur-2xl md:px-6">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] neon-text">
              PULSE / IDENTITY
            </p>
            <h1 className="font-display text-[30px] font-semibold tracking-[-0.06em]">You</h1>
          </div>
          <Link
            to="/settings"
            aria-label="Settings"
            className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/10 bg-white/[0.035] text-cyan press hover:border-brand/40 hover:bg-white/[0.07]"
          >
            <SettingsIcon className="h-5 w-5" />
          </Link>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING.cinematic}
          className="surface-panel flex flex-col items-center border-b border-white/[0.07] px-4 py-10"
        >
          <div className="relative">
            <PulseAvatar profile={profile} size="xl" showPresence showMood ring="brand" />
            <button
              type="button"
              aria-label="Change profile photo"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 grid h-10 w-10 place-items-center rounded-[13px] bg-[linear-gradient(135deg,#38cfff,#8f68ff_52%,#ff5b9b)] text-white shadow-[0_12px_28px_-12px_rgba(143,104,255,0.95)] press"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onPickPhoto(f);
              }}
            />
          </div>
          <p className="mt-5 font-display text-2xl font-semibold tracking-[-0.05em]">
            {profile?.display_name}
          </p>
          <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          <p className="mt-1 text-xs font-semibold tracking-[0.16em] neon-text">
            IDE {profile?.ide}
          </p>
        </motion.section>

        <section className="space-y-5 px-4 py-6 md:px-6">
          <Field label="Display name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className="h-11 w-full rounded-[13px] border border-white/10 bg-white/[0.035] px-4 text-sm outline-none transition-colors focus:border-brand/60"
            />
          </Field>
          <Field label="About">
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={2}
              maxLength={140}
              placeholder="Say something about you"
              className="w-full resize-none rounded-[13px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm outline-none transition-colors focus:border-brand/60 placeholder:text-muted-foreground"
            />
          </Field>
          <Field label="Phone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="Optional"
              className="h-11 w-full rounded-[13px] border border-white/10 bg-white/[0.035] px-4 text-sm outline-none transition-colors focus:border-brand/60 placeholder:text-muted-foreground"
            />
          </Field>

          <div>
            <p className="pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Mood
            </p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => save.mutate({ mood: profile?.mood === m.key ? null : m.key })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-[12px] border px-3 py-2 text-sm press",
                    profile?.mood === m.key
                      ? "border-brand bg-brand-soft text-foreground"
                      : "border-border bg-surface-2 text-muted-foreground",
                  )}
                >
                  <span aria-hidden>{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() =>
              save.mutate({
                display_name: displayName.trim() || profile?.display_name,
                about: about.trim() || null,
                phone: phone.trim() || null,
              })
            }
            className="h-12 w-full rounded-[14px] bg-[linear-gradient(105deg,#38cfff,#8f68ff_52%,#ff5b9b)] text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(143,104,255,0.95)] press disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </button>

          <button
            type="button"
            onClick={() => void signOut()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 text-sm font-semibold text-muted-foreground press hover:bg-white/[0.07]"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
