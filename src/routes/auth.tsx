import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, AtSign, Check, KeyRound, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/use-session";
import { ParallaxScene } from "@/components/pulse/illo/Scene";
import { BubbleObject, PulseCreature, type CreatureMood, type LookDir } from "@/components/pulse/illo/PulseCreature";
import { SPRING, DUR, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to Pulse — The Living Messenger" },
      {
        name: "description",
        content:
          "Join Pulse, the illustrated messenger where every message, reaction and voice note feels alive.",
      },
      { property: "og:title", content: "Sign in to Pulse — The Living Messenger" },
      {
        property: "og:description",
        content: "Join Pulse, the illustrated messenger where messaging feels alive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Field = "email" | "password" | "name" | "username" | null;

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [focus, setFocus] = useState<Field>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", username: "" });

  // Session is the source of truth: as soon as one exists, go to the app.
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void navigate({ to: "/chats", replace: true }), 450);
    return () => clearTimeout(t);
  }, [user, navigate]);


  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const mood: CreatureMood = done
    ? "celebrate"
    : focus === "password"
      ? "shy"
      : busy
        ? "typing"
        : focus
          ? "happy"
          : "wave";

  const look: LookDir =
    focus === "email" || focus === "name" ? "down" : focus === "username" ? "right" : "center";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
      } else {
        const username = form.username.trim().replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
        if (!form.name.trim() || !username) throw new Error("Add your name and a username first");
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/chats`,
            data: { display_name: form.name.trim(), username },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setBusy(false);
          setNeedsConfirm(true);
          toast.success("Almost there — check your email to confirm your account.");
          return;
        }
      }
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't work. Try again?");
      setBusy(false);
    }
  };

  const google = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) {
        toast.error("Google sign-in isn't available right now");
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      setDone(true);
    } catch {
      toast.error("Google sign-in isn't available right now");
      setBusy(false);
    }
  };


  return (
    <div className="relative min-h-screen">
      <PageBackground src={bgauthBg.url} />
      <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        {/* UI — authentication panel over the illustrated background */}
        <section className="relative rounded-[28px] border border-border bg-surface/85 p-5 shadow-float backdrop-blur-xl">

          <header className="mb-5 text-center">
            <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight">
              {mode === "in" ? "Welcome back" : "Make your Pulse"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "in"
                ? "Your conversations are waiting."
                : "A name, a handle, and you're alive here."}
            </p>
          </header>

          {needsConfirm && (
            <p className="mb-4 rounded-2xl border border-border bg-surface-2 p-3 text-center text-sm text-muted-foreground">
              Check your email to confirm your account, then sign in.
            </p>
          )}



          <form onSubmit={submit} className="space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {mode === "up" && (
                <motion.div
                  key="identity"
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <PulseField
                    icon={<User className="h-4 w-4" />}
                    label="Display name"
                    value={form.name}
                    onChange={set("name")}
                    onFocus={() => setFocus("name")}
                    onBlur={() => setFocus(null)}
                    autoComplete="name"
                  />
                  <PulseField
                    icon={<AtSign className="h-4 w-4" />}
                    label="Username"
                    value={form.username}
                    onChange={set("username")}
                    onFocus={() => setFocus("username")}
                    onBlur={() => setFocus(null)}
                    autoComplete="username"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <PulseField
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              type="email"
              value={form.email}
              onChange={set("email")}
              onFocus={() => setFocus("email")}
              onBlur={() => setFocus(null)}
              autoComplete="email"
            />
            <PulseField
              icon={<KeyRound className="h-4 w-4" />}
              label="Password"
              type="password"
              value={form.password}
              onChange={set("password")}
              onFocus={() => setFocus("password")}
              onBlur={() => setFocus(null)}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
            />

            <motion.button
              type="submit"
              disabled={busy}
              whileTap={{ scale: 0.96, y: 1 }}
              transition={SPRING.press}
              className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-[15px] font-semibold text-brand-foreground shadow-soft disabled:opacity-70"
            >
              <AnimatePresence mode="wait" initial={false}>
                {done ? (
                  <motion.span key="ok" initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                    <Check className="h-5 w-5" /> You're in
                  </motion.span>
                ) : (
                  <motion.span key="go" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    {mode === "in" ? "Sign in" : "Create my Pulse"}
                    <ArrowRight className="h-4 w-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <motion.button
            type="button"
            onClick={google}
            whileTap={{ scale: 0.96, y: 1 }}
            transition={SPRING.press}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-surface-2 text-sm font-medium press"
          >
            Continue with Google
          </motion.button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "in" ? "New to Pulse?" : "Already have a Pulse?"}{" "}
            <button
              type="button"
              onClick={() => setMode((m) => (m === "in" ? "up" : "in"))}
              className="font-semibold text-brand underline-offset-4 hover:underline"
            >
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </section>
      </main>
    </div>

  );
}

function PulseField({
  icon,
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-2 rounded-2xl border border-input bg-surface-2 px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
        <span className="text-muted-foreground">{icon}</span>
        <input
          {...props}
          required
          className={cn(
            "h-11 w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground",
            className,
          )}
        />
      </span>
    </label>
  );
}
