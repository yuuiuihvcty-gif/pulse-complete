import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { MessageCircle, Search, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pulse/AppShell";
import { BottomNav, SideRail } from "@/components/pulse/Navigation";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { EmptyState, ListSkeleton } from "@/components/pulse/EmptyState";
import { useApp } from "@/lib/app-context";
import {
  addContact,
  listContacts,
  removeContact,
  searchProfiles,
  startDirectConversation,
} from "@/lib/api";
import { SPRING } from "@/lib/motion";
import type { Profile } from "@/lib/types";
import { PageBackground } from "@/components/pulse/PageBackground";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts — Pulse, The Living Messenger" },
      {
        name: "description",
        content: "Find people on Pulse, save them as contacts and start a conversation instantly.",
      },
      { property: "og:title", content: "Contacts — Pulse" },
      {
        property: "og:description",
        content: "Find people on Pulse, save them as contacts and start a conversation instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <ContactsPage />
    </AppShell>
  ),
});

function ContactsPage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");

  const contacts = useQuery({
    queryKey: ["contacts", user.id],
    queryFn: () => listContacts(user.id),
  });

  const discovery = useQuery({
    queryKey: ["profile-search", term, user.id],
    queryFn: () => searchProfiles(term, user.id),
    enabled: term.trim().length >= 2,
  });

  const savedIds = useMemo(() => new Set((contacts.data ?? []).map((c) => c.id)), [contacts.data]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    const list = contacts.data ?? [];
    if (!t) return list;
    return list.filter(
      (p) =>
        p.display_name.toLowerCase().includes(t) || (p.username ?? "").toLowerCase().includes(t),
    );
  }, [contacts.data, term]);

  const discovered = (discovery.data ?? []).filter((p) => !savedIds.has(p.id));

  const save = useMutation({
    mutationFn: (id: string) => addContact(user.id, id),
    onSuccess: () => {
      toast.success("Contact saved");
      void queryClient.invalidateQueries({ queryKey: ["contacts", user.id] });
    },
    onError: () => toast.error("Couldn't save that contact"),
  });

  const drop = useMutation({
    mutationFn: (id: string) => removeContact(user.id, id),
    onSuccess: () => {
      toast.success("Contact removed");
      void queryClient.invalidateQueries({ queryKey: ["contacts", user.id] });
    },
    onError: () => toast.error("Couldn't remove that contact"),
  });

  const open = useMutation({
    mutationFn: (id: string) => startDirectConversation(id),
    onSuccess: (conversationId) => {
      void queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
      void navigate({ to: "/chats/$id", params: { id: conversationId } });
    },
    onError: () => toast.error("Couldn't open that conversation"),
  });

  return (
    <div className="relative min-h-screen md:flex">
      <PageBackground />
      <SideRail />
      <div className="mx-auto w-full max-w-2xl pb-24 md:pb-6">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-background/82 px-4 pb-4 pt-5 backdrop-blur-2xl md:px-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan">
            PULSE / PEOPLE
          </p>
          <h1 className="font-display text-[30px] font-semibold tracking-[-0.06em]">Contacts</h1>
          <p className="text-xs text-muted-foreground">
            {contacts.data?.length
              ? `${contacts.data.length} saved on Pulse`
              : "Search by name or @username"}
          </p>
          <label className="mt-5 flex items-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.035] px-3 transition-colors focus-within:border-cyan/60">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </header>

        {contacts.isLoading ? (
          <ListSkeleton />
        ) : filtered.length === 0 && discovered.length === 0 ? (
          <EmptyState
            scene="contacts"
            title={term ? "Nobody by that name." : "No contacts yet."}
            description={
              term
                ? "Try a different name or username."
                : "Search for someone by name or username to start your first chat."
            }
          />
        ) : (
          <div className="p-3">
            {filtered.length > 0 && (
              <ul className="space-y-1">
                {filtered.map((p) => (
                  <Row
                    key={p.id}
                    profile={p}
                    saved
                    onOpen={() => open.mutate(p.id)}
                    onToggle={() => drop.mutate(p.id)}
                  />
                ))}
              </ul>
            )}

            {discovered.length > 0 && (
              <>
                <h2 className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  On Pulse
                </h2>
                <ul className="space-y-1">
                  {discovered.map((p) => (
                    <Row
                      key={p.id}
                      profile={p}
                      saved={false}
                      onOpen={() => open.mutate(p.id)}
                      onToggle={() => save.mutate(p.id)}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function Row({
  profile,
  saved,
  onOpen,
  onToggle,
}: {
  profile: Profile;
  saved: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.layout}
      className="flex items-center gap-3 rounded-[18px] border border-transparent p-3.5 hover:border-white/8 hover:bg-white/[0.035]"
    >
      <PulseAvatar profile={profile} size="lg" showPresence showMood />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left press">
        <span className="block truncate font-display text-[16px] font-semibold">
          {profile.display_name}
        </span>
        <span className="block truncate text-[13px] text-muted-foreground">
          IDE {profile.ide} · {profile.about?.trim() || `@${profile.username}`}
        </span>
      </button>
      <button
        type="button"
        aria-label={`Message ${profile.display_name}`}
        onClick={onOpen}
        className="grid h-10 w-10 place-items-center rounded-[13px] bg-brand text-brand-foreground press"
      >
        <MessageCircle className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={saved ? `Remove ${profile.display_name}` : `Save ${profile.display_name}`}
        onClick={onToggle}
        className="grid h-10 w-10 place-items-center rounded-[13px] border border-white/10 press hover:bg-white/[0.07]"
      >
        {saved ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      </button>
    </motion.li>
  );
}
