import { Phone, PhoneOff, Video } from "lucide-react";
import { motion } from "motion/react";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { useCall } from "@/lib/calls/CallProvider";

export function IncomingCallDialog() {
  const { incoming, acceptIncoming, declineIncoming } = useCall();
  if (!incoming) return null;

  const video = incoming.session.type === "video";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Incoming ${incoming.session.type} call from ${incoming.caller.display_name}`}
      className="fixed inset-x-3 bottom-24 z-[70] mx-auto max-w-sm rounded-[30px] border border-border bg-surface/95 p-5 shadow-2xl backdrop-blur-xl md:bottom-6"
    >
      <div className="flex items-center gap-3">
        <PulseAvatar profile={incoming.caller} size="lg" ring="brand" showPresence />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Incoming call
          </p>
          <h2 className="truncate font-display text-xl font-bold">
            {incoming.caller.display_name}
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {video ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            {video ? "Video call" : "Voice call"}
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void declineIncoming()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-coral/15 text-sm font-semibold text-coral press"
        >
          <PhoneOff className="h-4 w-4" /> Decline
        </button>
        <button
          type="button"
          onClick={() => void acceptIncoming()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-foreground press"
        >
          <Phone className="h-4 w-4" /> Accept
        </button>
      </div>
    </motion.div>
  );
}
