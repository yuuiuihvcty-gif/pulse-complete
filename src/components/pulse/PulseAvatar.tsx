import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { MOODS, type Profile } from "@/lib/types";
import { useSignedUrl } from "@/hooks/use-signed-url";

const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-28 w-28 text-2xl",
};

export function PulseAvatar({
  profile,
  size = "md",
  showPresence = false,
  showMood = false,
  className,
  ring,
}: {
  profile?: Pick<Profile, "display_name" | "avatar_url" | "is_online" | "mood"> | null;
  size?: keyof typeof sizes;
  showPresence?: boolean;
  showMood?: boolean;
  className?: string;
  ring?: "none" | "brand" | "muted";
}) {
  const { url } = useSignedUrl(profile?.avatar_url);
  const mood = MOODS.find((m) => m.key === profile?.mood);

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "grid place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-soft to-secondary font-display font-semibold text-accent-foreground",
          sizes[size],
          ring === "brand" && "ring-2 ring-brand ring-offset-2 ring-offset-background",
          ring === "muted" && "ring-2 ring-border ring-offset-2 ring-offset-background",
        )}
      >
        {url ? (
          <img
            src={url}
            alt={profile?.display_name ?? "Profile photo"}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials(profile?.display_name ?? "?")}</span>
        )}
      </div>

      {showPresence && profile?.is_online && (
        <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center">
          <span className="absolute h-3 w-3 rounded-full bg-online/60 animate-ring" />
          <span className="h-3 w-3 rounded-full border-2 border-background bg-online" />
        </span>
      )}

      {showMood && mood && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          title={mood.label}
          className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-border bg-surface text-[10px] shadow-soft"
        >
          {mood.emoji}
        </motion.span>
      )}
    </div>
  );
}
