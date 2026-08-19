import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CircleUser, MessageCircle, Phone, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/contacts", label: "People", icon: Users },
  { to: "/updates", label: "Updates", icon: Sparkles },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/profile", label: "You", icon: CircleUser },
] as const;

export function BottomNav({ unread }: { unread?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="safe-bottom fixed inset-x-3 bottom-3 z-40 md:hidden">
      <div className="mx-auto max-w-md rounded-[24px] border border-white/10 bg-[#0d0f16]/88 p-1.5 shadow-float backdrop-blur-2xl">
        <ul className="grid grid-cols-5 gap-1">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(`${to}/`);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] px-1 text-[10px] font-semibold transition-colors press",
                    active
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label={label}
                >
                  {active && (
                    <motion.span
                      layoutId="pulse-nav-active"
                      transition={{ type: "spring", stiffness: 430, damping: 32 }}
                      className="absolute inset-0 rounded-[18px] bg-[linear-gradient(135deg,#3ccfff_0%,#8f68ff_52%,#ff5b9b_100%)] shadow-[0_8px_24px_-10px_rgba(143,104,255,0.9)]"
                    />
                  )}
                  <span className="relative">
                    <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.8} />
                    {to === "/chats" && !!unread && (
                      <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[9px] font-bold text-foreground">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </span>
                  <span className="relative">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export function SideRail({ unread }: { unread?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden w-[92px] shrink-0 flex-col items-center py-5 md:flex">
      <Link to="/chats" className="mb-8 flex flex-col items-center gap-2" aria-label="Pulse home">
          <span className="grid h-11 w-11 place-items-center rounded-[15px] bg-[linear-gradient(135deg,#3ccfff_0%,#8f68ff_52%,#ff5b9b_100%)] text-white shadow-[0_10px_26px_-10px_rgba(143,104,255,0.9)]">
          <span className="font-display text-xl font-bold tracking-[-0.08em]">pu</span>
        </span>
        <span className="font-display text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
          PULSE
        </span>
      </Link>
      <nav className="flex flex-col gap-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className={cn(
                "relative flex w-16 flex-col items-center gap-1 rounded-[20px] px-2 py-3 text-[10px] font-semibold press",
                active
                  ? "bg-[linear-gradient(135deg,#3ccfff_0%,#8f68ff_52%,#ff5b9b_100%)] text-white shadow-[0_10px_26px_-10px_rgba(143,104,255,0.82)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
              {to === "/chats" && !!unread && (
                <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[9px] font-bold text-foreground">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  actions,
  left,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  left?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#050608]/82 backdrop-blur-2xl">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 md:px-6 md:py-5">
        {left ?? <span />}
        <div className="min-w-0">
          <h1 className="truncate font-display text-[21px] font-semibold leading-tight tracking-[-0.04em]">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
    </header>
  );
}
