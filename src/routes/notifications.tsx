import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { AppShell } from "@/components/pulse/AppShell";
import { BottomNav, SideRail } from "@/components/pulse/Navigation";
import { EmptyState, ListSkeleton } from "@/components/pulse/EmptyState";
import { useApp } from "@/lib/app-context";
import { listNotifications, markNotificationRead, markNotificationsRead } from "@/lib/api";
import { chatListTime } from "@/lib/format";
import { PageBackground } from "@/components/pulse/PageBackground";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Pulse, The Living Messenger" },
      {
        name: "description",
        content: "Keep up with replies, reactions, mentions and new activity on Pulse.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <NotificationsPage />
    </AppShell>
  ),
});

function NotificationsPage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: () => listNotifications(user.id),
  });

  const markRead = useMutation({
    mutationFn: () => markNotificationsRead(user.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    },
    onError: () => toast.error("Couldn't mark notifications as read"),
  });

  const rows = notifications.data ?? [];
  const unread = rows.filter((notification) => !notification.read).length;

  const openNotification = async (notification: (typeof rows)[number]) => {
    if (!notification.read) {
      await markNotificationRead(notification.id, user.id);
      void queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    }
    if (notification.conversation_id) {
      void navigate({ to: "/chats/$id", params: { id: notification.conversation_id } });
    } else if (notification.call_id) {
      void navigate({ to: "/calls" });
    } else if (notification.story_id) {
      void navigate({ to: "/updates" });
    } else if (notification.target_user_id) {
      void navigate({ to: "/contacts" });
    }
  };

  return (
    <div className="relative min-h-screen md:flex">
      <PageBackground />
      <SideRail />
      <main className="mx-auto w-full max-w-2xl pb-24 md:pb-6">
        <header className="sticky top-0 z-30 flex items-end justify-between gap-3 border-b border-white/8 bg-background/82 px-4 pb-4 pt-5 backdrop-blur-2xl md:px-6">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber">
              PULSE / SIGNALS
            </p>
            <h1 className="font-display text-[30px] font-semibold tracking-[-0.06em]">
              Notifications
            </h1>
            <p className="text-xs text-muted-foreground">
              {unread > 0
                ? `${unread} unread update${unread === 1 ? "" : "s"}`
                : "You are all caught up"}
            </p>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markRead.mutate()}
              disabled={markRead.isPending}
              className="inline-flex items-center gap-1.5 rounded-[11px] border border-white/10 px-3 py-2 text-xs font-semibold press hover:bg-white/[0.07] disabled:opacity-60"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark read
            </button>
          )}
        </header>

        {notifications.isLoading ? (
          <ListSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            scene="conversations"
            title="No notifications yet."
            description="Reactions, replies and new activity will appear here."
          />
        ) : (
          <ul className="space-y-1 p-3 md:p-4">
            {rows.map((notification) => (
              <motion.li
                key={notification.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[18px] border ${notification.read ? "border-transparent" : "border-brand/25 bg-brand/[0.06]"}`}
              >
                <button
                  type="button"
                  onClick={() => void openNotification(notification)}
                  className="flex w-full items-start gap-3 rounded-[18px] p-3.5 text-left press hover:bg-white/[0.035]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-white/10 bg-white/[0.035] text-brand">
                    <Bell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[15px] font-semibold">{notification.title}</p>
                    {notification.body && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {chatListTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.read && <span className="mt-2 h-2 w-2 rounded-full bg-brand" />}
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
