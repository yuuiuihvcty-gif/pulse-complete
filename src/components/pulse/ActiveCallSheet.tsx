import { useEffect, useRef, type ReactNode } from "react";
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { useCall } from "@/lib/calls/CallProvider";

export function ActiveCallSheet() {
  const { active, endCall, toggleMute, toggleCamera, toggleSpeaker } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = active?.localStream ?? null;
  }, [active?.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = active?.remoteStream ?? null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = active?.remoteStream ?? null;
  }, [active?.remoteStream]);

  useEffect(() => {
    const volume = active?.speakerEnabled ? 1 : 0;
    if (remoteVideoRef.current) remoteVideoRef.current.volume = volume;
    if (remoteAudioRef.current) remoteAudioRef.current.volume = volume;
  }, [active?.speakerEnabled]);

  if (!active) return null;
  const isVideo = active.session.type === "video";
  const connected = active.phase === "connected";
  const elapsed = active.connectedAt
    ? formatElapsed(Math.max(0, Math.round((Date.now() - active.connectedAt) / 1000)))
    : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${isVideo ? "Video" : "Voice"} call with ${active.peer.display_name}`}
      className="fixed inset-0 z-[80] flex flex-col bg-background/95 p-4 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between px-1 py-2">
        <div>
          <p className="font-display text-lg font-semibold">{active.peer.display_name}</p>
          <p className="text-xs text-muted-foreground">
            {connected
              ? `${active.session.type === "video" ? "Video" : "Voice"} call${elapsed ? ` · ${elapsed}` : ""}`
              : active.phase === "ringing"
                ? "Ringing…"
                : "Connecting…"}
          </p>
        </div>
        <PulseAvatar profile={active.peer} size="md" showPresence />
      </div>

      <div className="relative my-4 min-h-0 flex-1 overflow-hidden rounded-[32px] border border-border bg-surface-2">
        {isVideo ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
            {!active.remoteStream && (
              <div className="absolute inset-0 grid place-items-center">
                <PulseAvatar profile={active.peer} size="xl" ring="brand" showPresence />
              </div>
            )}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-4 right-4 h-32 w-24 rounded-2xl border-2 border-background object-cover shadow-xl md:h-40 md:w-28"
            />
          </>
        ) : (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <PulseAvatar profile={active.peer} size="xl" ring="brand" showPresence />
              {!active.remoteStream && (
                <p className="mt-4 text-sm text-muted-foreground">Waiting for audio…</p>
              )}
            </div>
          </div>
        )}
        <audio ref={remoteAudioRef} autoPlay playsInline />
      </div>

      <div className="flex items-center justify-center gap-3 pb-3">
        <ControlButton
          label={active.muted ? "Unmute" : "Mute"}
          active={active.muted}
          onClick={toggleMute}
        >
          {active.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </ControlButton>
        {isVideo && (
          <ControlButton
            label={active.cameraEnabled ? "Turn camera off" : "Turn camera on"}
            active={!active.cameraEnabled}
            onClick={toggleCamera}
          >
            {active.cameraEnabled ? (
              <Camera className="h-5 w-5" />
            ) : (
              <CameraOff className="h-5 w-5" />
            )}
          </ControlButton>
        )}
        <ControlButton
          label={active.speakerEnabled ? "Mute speaker" : "Use speaker"}
          active={!active.speakerEnabled}
          onClick={toggleSpeaker}
        >
          {active.speakerEnabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
        </ControlButton>
        <button
          type="button"
          onClick={() => void endCall()}
          aria-label="End call"
          className="grid h-14 w-14 place-items-center rounded-full bg-coral text-background shadow-soft press"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </motion.div>
  );
}

function ControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-12 w-12 place-items-center rounded-full border press ${active ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface-2"}`}
    >
      {children}
    </button>
  );
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
