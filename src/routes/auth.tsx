import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, AtSign, Check, KeyRound, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/use-session";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PageBackground } from "@/components/pulse/PageBackground";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Pulse — Conversations that move" },
      {
        name: "description",
        content: "A considered space for conversations, updates, and the people who matter.",
      },
    ],
  }),
  component: AuthPage,
});

type Field = "email" | "password" | "name" | "username" | null;

type AuthForm = { email: string; password: string; name: string; username: string };

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [focus, setFocus] = useState<Field>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [form, setForm] = useState<AuthForm>({ email: "", password: "", name: "", username: "" });

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => void navigate({ to: "/chats", replace: true }), 450);
    return () => clearTimeout(timer);
  }, [user, navigate]);

  const set = (key: keyof AuthForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
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
        const username = form.username
          .trim()
          .replace(/[^a-zA-Z0-9_]/g, "")
          .toLowerCase();
        if (!form.name.trim() || !username) throw new Error("Add your name and username first");
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
          setNeedsConfirm(true);
          toast.success("Almost there — check your email to confirm your account.");
          setBusy(false);
          return;
        }
      }
      setDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't work. Try again?");
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
      if (!result.redirected) setDone(true);
    } catch {
      toast.error("Google sign-in isn't available right now");
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!form.email.trim()) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
      redirectTo: `${window.location.origin}/settings`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  };

  return (
    <div className="pulse-field relative min-h-screen overflow-hidden">
      <PageBackground />
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
        <span className="pulse-field-line left-[-12%] top-[30%]" />
        <span className="pulse-field-line left-[28%] top-[62%] rotate-[9deg] opacity-30" />
        <span className="absolute left-[13%] top-[17%] h-1.5 w-1.5 rounded-full bg-brand animate-signal" />
        <span className="absolute right-[17%] top-[38%] h-1.5 w-1.5 rounded-full bg-cyan animate-signal [animation-delay:800ms]" />
        <span className="absolute bottom-[24%] left-[27%] h-1.5 w-1.5 rounded-full bg-amber animate-signal [animation-delay:1.3s]" />
      </div>
      <main className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_420px] lg:gap-24 lg:px-14">
        <section className="hidden lg:block animate-rise-in">
          <p className="mb-10 font-display text-sm font-semibold tracking-[0.32em] neon-text">
            PULSE / 01
          </p>
          <h1 className="max-w-xl font-display text-6xl font-semibold leading-[0.96] tracking-[-0.07em] text-balance xl:text-7xl">
            Conversations
            <span className="block neon-text">that move.</span>
          </h1>
          <p className="mt-8 max-w-md text-lg leading-relaxed text-muted-foreground">
            A calmer space for the people, messages, and small moments that keep your world in
            motion.
          </p>
          <div className="mt-16 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-px w-14 bg-brand/60" />
            <span>Human connection, considered</span>
          </div>
        </section>

        <motion.section
          layout
          className="surface-elevated relative animate-rise-in rounded-[30px] border border-white/10 p-6 sm:p-8 md:border-white/[0.13]"
        >
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-2xl font-semibold tracking-[-0.05em]">
                {mode === "in" ? "Welcome back" : "Find your people"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "in"
                  ? "Your space is ready when you are."
                  : "Start with a name. Make it yours."}
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-[14px] border border-brand/35 bg-[linear-gradient(135deg,rgba(56,207,255,0.18),rgba(143,104,255,0.2),rgba(255,91,155,0.18))] text-white">
              <span className="font-display text-sm font-bold tracking-[-0.12em]">pu</span>
            </span>
          </div>

          {needsConfirm && (
            <p className="mb-5 rounded-2xl border border-brand/20 bg-brand/8 p-3 text-sm leading-relaxed text-muted-foreground">
              Check your email to confirm the account, then return here to sign in.
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
                    icon={<UserRound />}
                    label="Display name"
                    value={form.name}
                    onChange={set("name")}
                    onFocus={() => setFocus("name")}
                    onBlur={() => setFocus(null)}
                    autoComplete="name"
                    active={focus === "name"}
                  />
                  <PulseField
                    icon={<AtSign />}
                    label="Username"
                    value={form.username}
                    onChange={set("username")}
                    onFocus={() => setFocus("username")}
                    onBlur={() => setFocus(null)}
                    autoComplete="username"
                    active={focus === "username"}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <PulseField
              icon={<Mail />}
              label="Email"
              type="email"
              value={form.email}
              onChange={set("email")}
              onFocus={() => setFocus("email")}
              onBlur={() => setFocus(null)}
              autoComplete="email"
              active={focus === "email"}
            />
            <PulseField
              icon={<KeyRound />}
              label="Password"
              type="password"
              value={form.password}
              onChange={set("password")}
              onFocus={() => setFocus("password")}
              onBlur={() => setFocus(null)}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              active={focus === "password"}
            />
            <motion.button
              type="submit"
              disabled={busy}
              whileTap={{ scale: 0.98, y: 1 }}
              transition={SPRING.press}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[linear-gradient(105deg,#38cfff,#8f68ff_52%,#ff5b9b)] text-[15px] font-semibold text-white shadow-[0_14px_32px_-16px_rgba(143,104,255,0.95)] press disabled:opacity-70"
            >
              <AnimatePresence mode="wait" initial={false}>
                {done ? (
                  <motion.span
                    key="ok"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" /> You’re in
                  </motion.span>
                ) : (
                  <motion.span
                    key="go"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                  >
                    {mode === "in" ? "Sign in" : "Create account"}
                    <ArrowUpRight className="h-4 w-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            <span className="h-px flex-1 bg-white/10" /> or{" "}
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <button
            type="button"
            onClick={google}
            className="flex h-11 w-full items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.035] text-sm font-semibold text-foreground press hover:border-cyan/40 hover:bg-white/[0.06]"
          >
            Continue with Google
          </button>

          <div className="mt-6 flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => setMode((current) => (current === "in" ? "up" : "in"))}
              className="font-semibold text-brand hover:underline underline-offset-4"
            >
              {mode === "in" ? "Create an account" : "Sign in instead"}
            </button>
            {mode === "in" && (
              <button
                type="button"
                onClick={() => void forgotPassword()}
                className="text-xs hover:text-foreground"
              >
                Forgot password?
              </button>
            )}
          </div>
        </motion.section>
      </main>
    </div>
  );
}

function PulseField({
  icon,
  label,
  active,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 ml-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "flex items-center gap-3 rounded-[14px] border bg-white/[0.035] px-3 transition-colors",
          active ? "border-brand/70 ring-2 ring-brand/15 shadow-[0_0_24px_-16px_rgba(56,207,255,0.85)]" : "border-white/10",
        )}
      >
        <span className={cn("text-muted-foreground transition-colors", active && "text-brand")}>
          {icon}
        </span>
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
