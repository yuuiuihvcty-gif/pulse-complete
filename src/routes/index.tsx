import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageBackground } from "@/components/pulse/PageBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulse — The Living Messenger" },
      {
        name: "description",
        content:
          "Pulse is a focused, expressive messenger for meaningful conversations, voice notes, updates, and calls.",
      },
      { property: "og:title", content: "Pulse — The Living Messenger" },
      {
        property: "og:description",
        content:
          "A focused messenger for meaningful conversations, voice notes, updates, and calls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/chats", replace: true });
  }, [navigate]);

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background">
      <PageBackground />
      <div className="relative z-10 grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <span className="signal-dot h-2 w-2 rounded-full bg-brand" />
          Warming up Pulse…
        </div>
      </div>
    </div>
  );
}
