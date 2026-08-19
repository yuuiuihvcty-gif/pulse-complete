import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Search as SearchIcon, UserRound } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/pulse/AppShell";
import { BottomNav, SideRail } from "@/components/pulse/Navigation";
import { EmptyState, ListSkeleton } from "@/components/pulse/EmptyState";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { useApp } from "@/lib/app-context";
import { globalSearch, startDirectConversation } from "@/lib/api";
import { chatListTime } from "@/lib/format";
import { PageBackground } from "@/components/pulse/PageBackground";
import bgchatsBg from "@/assets/bg-chats.jpeg.asset.json";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — Pulse, The Living Messenger" },
      {
        name: "description",
        content: "Search Pulse people and messages you are authorized to see.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <SearchPage />
    </AppShell>
  ),
});

function SearchPage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const query = useQuery({
    queryKey: ["global-search", user.id, term.trim()],
    queryFn: () => globalSearch(term, user.id),
    enabled: term.trim().length >= 2,
    staleTime: 15_000,
  });
  const hasTerm = term.trim().length >= 2;
  const people = query.data?.people ?? [];
  const messages = query.data?.messages ?? [];

  return (
    <div className="relative min-h-screen md:flex">
      <PageBackground src={bgchatsBg.url} />
      <SideRail />
      <main className="mx-auto w-full max-w-2xl pb-24 md:pb-6">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/85 px-4 pb-4 pt-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-3">
            <Link
              to="/chats"
              aria-label="Back to chats"
              className="grid h-10 w-10 place-items-center rounded-full press hover:bg-surface-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-display text-[24px] font-bold tracking-tight">Search Pulse</h1>
              <p className="text-xs text-muted-foreground">People and messages in your network</p>
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-full border border-input bg-surface-2 px-3">
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search by name, IDE, or message text"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </header>

        {!hasTerm ? (
          <EmptyState
            scene="search"
            title="Search people and messages."
            description="Search by name, username, six-digit IDE, or message text."
          />
        ) : query.isLoading ? (
          <ListSkeleton rows={5} />
        ) : people.length === 0 && messages.length === 0 ? (
          <EmptyState
            scene="search"
            title="Nothing found."
            description="Try a different name or phrase."
          />
        ) : (
          <div className="space-y-5 p-3">
            {people.length > 0 && (
              <section>
                <h2 className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  People
                </h2>
                <ul className="space-y-1">
                  {people.map((person) => (
                    <li key={person.id}>
                      <button
                        type="button"
                        onClick={() => {
                          void startDirectConversation(person.id)
                            .then((conversationId) =>
                              navigate({ to: "/chats/$id", params: { id: conversationId } }),
                            )
                            .catch(() => undefined);
                        }}
                        className="flex w-full items-center gap-3 rounded-3xl p-3 text-left press hover:bg-surface-2"
                      >
                        <PulseAvatar profile={person} size="md" showPresence showMood />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-[15px] font-semibold">
                            {person.display_name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            IDE {person.ide} · @{person.username}
                          </span>
                        </span>
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {messages.length > 0 && (
              <section>
                <h2 className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Messages
                </h2>
                <ul className="space-y-1">
                  {messages.map((message) => (
                    <li key={message.id}>
                      <Link
                        to="/chats/$id"
                        params={{ id: message.conversation_id }}
                        className="flex items-start gap-3 rounded-3xl p-3 press hover:bg-surface-2"
                      >
                        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                          <MessageCircle className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block line-clamp-2 text-sm">
                            {message.body ?? `[${message.type}]`}
                          </span>
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            {chatListTime(message.created_at)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
