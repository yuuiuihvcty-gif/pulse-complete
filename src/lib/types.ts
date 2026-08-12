export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  about: string | null;
  phone: string | null;
  mood: string | null;
  is_online: boolean;
  last_seen: string;
};

export type MessageType = "text" | "image" | "video" | "voice" | "file" | "location" | "contact";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: MessageType;
  body: string | null;
  media_url: string | null;
  media_meta: Record<string, unknown>;
  reply_to: string | null;
  pinned: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type Reaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

export type ConversationSummary = {
  id: string;
  is_group: boolean;
  name: string | null;
  avatar_url: string | null;
  last_message_at: string;
  muted: boolean;
  last_read_at: string;
  unread: number;
  other: Profile | null;
  lastMessage: Message | null;
};

export type Story = {
  id: string;
  user_id: string;
  type: "text" | "image" | "video";
  body: string | null;
  media_url: string | null;
  background: string | null;
  created_at: string;
  expires_at: string;
};

export type CallRecord = {
  id: string;
  caller_id: string;
  callee_id: string;
  type: "voice" | "video";
  status: "missed" | "answered" | "declined";
  duration_seconds: number;
  created_at: string;
};

export type UserSettings = {
  user_id: string;
  theme: "light" | "dark" | "system";
  wallpaper: string;
  bubble_style: string;
  enter_to_send: boolean;
  media_autodownload: boolean;
  notif_messages: boolean;
  notif_sound: boolean;
  notif_vibrate: boolean;
  show_last_seen: boolean;
  show_online: boolean;
  read_receipts: boolean;
  photo_visibility: string;
  status_visibility: string;
};

export const MOODS = [
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "tired", emoji: "😴", label: "Tired" },
  { key: "energetic", emoji: "🔥", label: "Energetic" },
  { key: "sad", emoji: "😔", label: "Sad" },
  { key: "listening", emoji: "🎧", label: "Listening" },
  { key: "studying", emoji: "📚", label: "Studying" },
  { key: "gaming", emoji: "🎮", label: "Gaming" },
] as const;

export const QUICK_REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥"] as const;
