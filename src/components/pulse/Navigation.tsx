import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CircleUser, MessageCircle, Phone, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/updates", label: "Updates", icon: Sparkles },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/profile", label: "You", icon: CircleUser },
] as const;

export function BottomNav({ unread }: { unread?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <li key={to}>
              <Link
                to={to}
                className="relative flex flex-col items-center gap-1 py-2.5 press"
                aria-label={label}
              >
                <span className="relative grid h-8 w-12 place-items-center">
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-brand-soft"
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative h-5 w-5 transition-colors",
                      active ? "text-brand" : "text-muted-foreground",
                    )}
                  />
                  {to === "/chats" && !!unread && (
                    <span className="absolute -right-0 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-background">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    active ? "text-brand" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

export function SideRail({ unread }: { unread?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden w-20 shrink-0 flex-col items-center gap-2 border-r border-border bg-surface/70 py-5 md:flex">
      <Link to="/chats" className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-soft">
        <span className="font-display text-lg font-bold">P</span>
      </Link>
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className={cn(
              "relative grid h-12 w-12 place-items-center rounded-2xl press",
              active ? "bg-brand-soft text-brand" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            <Icon className="h-5 w-5" />
            {to === "/chats" && !!unread && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-background">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        );
      })}
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
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-xl">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
        {left ?? <span />}
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-semibold leading-tight">{title}</h1>
          {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
    </header>
  );
}
