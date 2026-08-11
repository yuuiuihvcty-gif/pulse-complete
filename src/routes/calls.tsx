import { createFileRoute } from "@tanstack/react-router";
import { BottomNav, SideRail } from "@/components/pulse/Navigation";

export const Route = createFileRoute("/calls")({
  head: () => ({
    meta: [
      { title: "Calls — Pulse" },
      { name: "description", content: "Pulse calls: a livelier, more expressive way to message." },
      { property: "og:title", content: "Calls — Pulse" },
      { property: "og:description", content: "Pulse calls: a livelier, more expressive way to message." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background sm:flex">
      <SideRail />
      <div className="px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Calls</h1>
        <p className="mt-2 text-sm text-muted-foreground">Coming up next in this build.</p>
      </div>
      <BottomNav />
    </div>
  );
}
