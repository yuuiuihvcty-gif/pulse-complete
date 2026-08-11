import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ParallaxScene, PulseLoader } from "@/components/pulse/illo/Scene";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulse — The Living Messenger" },
      {
        name: "description",
        content:
          "Pulse is an illustrated, motion-first messenger: expressive chats, voice notes, moods and reactions that feel alive.",
      },
      { property: "og:title", content: "Pulse — The Living Messenger" },
      {
        property: "og:description",
        content: "An illustrated, motion-first messenger where every message feels alive.",
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
    <ParallaxScene className="min-h-screen">
      <div className="grid min-h-screen place-items-center">
        <PulseLoader label="Warming up Pulse…" />
      </div>
    </ParallaxScene>
  );
}
