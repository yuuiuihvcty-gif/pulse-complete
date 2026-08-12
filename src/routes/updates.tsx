import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pulse/AppShell";
import { BottomNav, SideRail } from "@/components/pulse/Navigation";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { EmptyState, ListSkeleton } from "@/components/pulse/EmptyState";
import { useApp } from "@/lib/app-context";
import { deleteStory, listStories, listStoryViews, postStory, viewStory } from "@/lib/api";
import { uploadMedia, validateFile } from "@/lib/media";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { chatListTime } from "@/lib/format";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Profile, Story } from "@/lib/types";

export const Route = createFileRoute("/updates")({
  head: () => ({
    meta: [
      { title: "Updates — Pulse, The Living Messenger" },
      {
        name: "description",
        content: "Share a 24-hour update and watch what your people are up to right now.",
      },
      { property: "og:title", content: "Updates — Pulse" },
      {
        property: "og:description",
        content: "Share a 24-hour update and watch what your people are up to right now.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <UpdatesPage />
    </AppShell>
  ),
});

const BACKGROUNDS = ["aurora", "mint", "dusk", "plain"] as const;

function UpdatesPage() {
  const { user, profile } = useApp();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [background, setBackground] = useState<string>("aurora");
  const [viewing, setViewing] = useState<{ story: Story; author: Profile | null } | null>(null);

  const stories = useQuery({ queryKey: ["stories"], queryFn: listStories });
  const seen = useQuery({ queryKey: ["story-views", user.id], queryFn: () => listStoryViews(user.id) });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["stories"] });
    void queryClient.invalidateQueries({ queryKey: ["story-views", user.id] });
  };

  const post = useMutation({
    mutationFn: (input: Parameters<typeof postStory>[0]) => postStory(input),
    onSuccess: () => {
      setComposing(false);
      setText("");
      toast.success("Update shared");
      refresh();
    },
    onError: () => toast.error("Couldn't share that update"),
  });

  const grouped = useMemo(() => {
    const list = stories.data?.stories ?? [];
    const authors = stories.data?.authors ?? new Map<string, Profile>();
    const byUser = new Map<string, Story[]>();
    list.forEach((s) => {
      byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
    });
    return [...byUser.entries()].map(([userId, items]) => ({
      userId,
      author: authors.get(userId) ?? (userId === user.id ? profile : null),
      items,
      unseen: items.some((i) => !(seen.data ?? new Set<string>()).has(i.id)),
    }));
  }, [stories.data, seen.data, user.id, profile]);

  const onPickMedia = async (file: File) => {
    const problem = validateFile(file, "Update");
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      const path = await uploadMedia(user.id, file, file.name);
      post.mutate({
        userId: user.id,
        type: file.type.startsWith("video/") ? "video" : "image",
        body: text.trim() || null,
        mediaUrl: path,
        background,
      });
    } catch {
      toast.error("Upload failed");
    }
  };

  const openStory = (story: Story, author: Profile | null) => {
    setViewing({ story, author });
    void viewStory(story.id, user.id).then(refresh);
  };

  return (
    <div className="min-h-screen bg-background md:flex">
      <SideRail />
      <div className="mx-auto w-full max-w-2xl pb-24 md:pb-6">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/85 px-4 pb-3 pt-5 backdrop-blur-xl">
          <div>
            <h1 className="font-display text-[26px] font-bold tracking-tight">Updates</h1>
            <p className="text-xs text-muted-foreground">Gone in 24 hours</p>
          </div>
          <button
            type="button"
            onClick={() => setComposing((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-full bg-brand text-brand-foreground shadow-soft press"
            aria-label="Share an update"
          >
            {composing ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        </header>

        <AnimatePresence initial={false}>
          {composing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border bg-surface px-4 py-4"
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder="What's happening right now?"
                aria-label="Update text"
                className="w-full resize-none rounded-2xl border border-input bg-surface-2 px-4 py-3 text-sm outline-none focus:border-brand placeholder:text-muted-foreground"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {BACKGROUNDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBackground(b)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize press",
                      background === b
                        ? "border-brand bg-brand-soft"
                        : "border-border bg-surface-2 text-muted-foreground",
                    )}
                  >
                    {b}
                  </button>
                ))}
                <label className="ml-auto grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-border press hover:bg-surface-2">
                  <ImagePlus className="h-4 w-4" />
                  <span className="sr-only">Add a photo or video</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void onPickMedia(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!text.trim() || post.isPending}
                  onClick={() =>
                    post.mutate({ userId: user.id, type: "text", body: text.trim(), background })
                  }
                  className="h-10 rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground press disabled:opacity-50"
                >
                  Share
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {stories.isLoading ? (
          <ListSkeleton rows={4} />
        ) : grouped.length === 0 ? (
          <EmptyState
            scene="stories"
            title="No updates yet."
            description="Share the first one — it disappears after 24 hours."
          />
        ) : (
          <ul className="space-y-1 p-2">
            {grouped.map((g) => (
              <motion.li
                layout
                key={g.userId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING.layout}
                className="flex items-center gap-3 rounded-3xl p-3 hover:bg-surface-2"
              >
                <button
                  type="button"
                  onClick={() => openStory(g.items[g.items.length - 1]!, g.author)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left press"
                >
                  <PulseAvatar
                    profile={g.author}
                    size="lg"
                    ring={g.unseen ? "brand" : "muted"}
                    showMood
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[16px] font-semibold">
                      {g.userId === user.id ? "Your update" : g.author?.display_name ?? "Someone"}
                    </span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {g.items.length} update{g.items.length > 1 ? "s" : ""} ·{" "}
                      {chatListTime(g.items[g.items.length - 1]!.created_at)}
                    </span>
                  </span>
                </button>
                {g.userId === user.id && (
                  <button
                    type="button"
                    aria-label="Delete your latest update"
                    onClick={() =>
                      void deleteStory(g.items[g.items.length - 1]!.id)
                        .then(() => {
                          toast.success("Update deleted");
                          refresh();
                        })
                        .catch(() => toast.error("Couldn't delete that update"))
                    }
                    className="grid h-10 w-10 place-items-center rounded-full border border-border press hover:bg-surface-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav />

      <AnimatePresence>
        {viewing && (
          <StoryViewer
            story={viewing.story}
            author={viewing.author}
            onClose={() => setViewing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StoryViewer({
  story,
  author,
  onClose,
}: {
  story: Story;
  author: Profile | null;
  onClose: () => void;
}) {
  const { url } = useSignedUrl(story.media_url);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-background/95 p-4 backdrop-blur-xl"
      role="dialog"
      aria-label="Update"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close update"
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-surface press"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="w-full max-w-sm">
        <div className="mb-3 flex items-center gap-3">
          <PulseAvatar profile={author} size="md" />
          <div>
            <p className="font-display text-sm font-semibold">{author?.display_name ?? "Someone"}</p>
            <p className="text-xs text-muted-foreground">{chatListTime(story.created_at)}</p>
          </div>
        </div>
        <div
          className={cn(
            "grid min-h-[60vh] place-items-center overflow-hidden rounded-3xl border border-border p-6 text-center",
            `wp-${story.background ?? "aurora"}`,
            "wallpaper",
          )}
        >
          {story.type === "text" || !url ? (
            <p className="font-display text-2xl font-semibold leading-snug">{story.body}</p>
          ) : story.type === "video" ? (
            <video src={url} controls autoPlay className="max-h-[60vh] w-full rounded-2xl" />
          ) : (
            <img src={url} alt={story.body ?? "Update"} className="max-h-[60vh] rounded-2xl" />
          )}
        </div>
        {story.type !== "text" && story.body && (
          <p className="mt-3 text-center text-sm text-muted-foreground">{story.body}</p>
        )}
      </div>
    </motion.div>
  );
}
