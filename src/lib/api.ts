import { supabase } from "@/integrations/supabase/client";
import type {
  CallRecord,
  CallSession,
  CallSessionStatus,
  ConversationSummary,
  Message,
  MessageType,
  Notification,
  Profile,
  Reaction,
  Story,
  StoryReply,
  UserSettings,
} from "@/lib/types";

const PROFILE_COLS = "id,ide,username,display_name,avatar_url,about,phone,mood,is_online,last_seen";
const PROFILE_COLS_LEGACY = "id,username,display_name,avatar_url,about,phone,mood,is_online,last_seen";

type ApiError = { message: string } | null;
type ProfileQueryResult = { data: unknown; error: ApiError };

function missingIdeColumn(error: ApiError) {
  return Boolean(error?.message && /profiles\.ide|column .*ide does not exist/i.test(error.message));
}

async function queryProfiles(
  build: (columns: string) => PromiseLike<ProfileQueryResult>,
): Promise<ProfileQueryResult> {
  const result = await build(PROFILE_COLS);
  return result.error && missingIdeColumn(result.error) ? build(PROFILE_COLS_LEGACY) : result;
}

function normalizeProfileRows(data: unknown): Profile[] {
  return ((data as Array<Partial<Profile>> | null) ?? []).map((row) => ({
    id: row.id ?? "",
    ide: row.ide ?? "",
    username: row.username ?? "",
    display_name: row.display_name ?? row.username ?? "Pulse user",
    avatar_url: row.avatar_url ?? null,
    about: row.about ?? null,
    phone: row.phone ?? null,
    mood: row.mood ?? null,
    is_online: row.is_online ?? false,
    last_seen: row.last_seen ?? new Date(0).toISOString(),
  }));
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ---------------- profiles & settings ---------------- */

export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const result = await queryProfiles((columns) =>
    supabase.from("profiles").select(columns).in("id", unique),
  );
  if (result.error) throw new Error(result.error.message);
  return normalizeProfileRows(result.data);
}

export async function getProfile(id: string) {
  const result = await queryProfiles((columns) =>
    supabase.from("profiles").select(columns).eq("id", id).maybeSingle(),
  );
  if (result.error) throw new Error(result.error.message);
  const rows = normalizeProfileRows(result.data ? [result.data] : []);
  return rows[0] ?? null;
}

export async function updateProfile(id: string, patch: Partial<Profile>) {
  const result = await queryProfiles((columns) =>
    supabase.from("profiles").update(patch).eq("id", id).select(columns).single(),
  );
  if (result.error) throw new Error(result.error.message);
  return normalizeProfileRows(result.data ? [result.data] : [])[0];
}

export async function getSettings(userId: string) {
  const existing = unwrap(
    await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
  ) as UserSettings | null;
  if (existing) return existing;
  return unwrap(
    await supabase.from("user_settings").insert({ user_id: userId }).select("*").single(),
  ) as UserSettings;
}

export async function updateSettings(userId: string, patch: Partial<UserSettings>) {
  return unwrap(
    await supabase
      .from("user_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select("*")
      .single(),
  ) as UserSettings;
}

/* ---------------- conversations ---------------- */

export async function listConversations(me: string): Promise<ConversationSummary[]> {
  void me;
  const rows = (unwrap(await supabase.rpc("list_conversation_summaries")) ?? []) as Array<{
    conversation_id: string;
    is_group: boolean;
    name: string | null;
    avatar_url: string | null;
    last_message_at: string;
    muted: boolean;
    last_read_at: string;
    unread: number;
    last_message: Message | null;
    other_user_id: string | null;
  }>;

  const profiles = await getProfilesByIds(
    rows.flatMap((row) => (row.other_user_id ? [row.other_user_id] : [])),
  );
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return rows.map((row) => ({
    id: row.conversation_id,
    is_group: row.is_group,
    name: row.name,
    avatar_url: row.avatar_url,
    last_message_at: row.last_message_at,
    muted: row.muted,
    last_read_at: row.last_read_at,
    unread: Number(row.unread),
    other: row.other_user_id ? (profileById.get(row.other_user_id) ?? null) : null,
    lastMessage: row.last_message,
  }));
}

export async function getConversation(id: string, me: string) {
  const conv = unwrap(
    await supabase
      .from("conversations")
      .select("id,is_group,name,avatar_url,created_by,last_message_at")
      .eq("id", id)
      .maybeSingle(),
  ) as {
    id: string;
    is_group: boolean;
    name: string | null;
    avatar_url: string | null;
  } | null;
  if (!conv) return null;
  const memberRows = (unwrap(
    await supabase
      .from("conversation_members")
      .select("user_id,muted,last_read_at")
      .eq("conversation_id", id),
  ) ?? []) as Array<{ user_id: string; muted: boolean; last_read_at: string }>;
  const profiles = await getProfilesByIds(memberRows.map((m) => m.user_id));
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const mine = memberRows.find((m) => m.user_id === me);
  const otherRow = memberRows.find((m) => m.user_id !== me);
  return {
    ...conv,
    members: profiles,
    other: otherRow ? (byId.get(otherRow.user_id) ?? null) : null,
    muted: mine?.muted ?? false,
    myLastRead: mine?.last_read_at ?? null,
  };
}

export async function startDirectConversation(otherId: string) {
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
    _other: otherId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function setMuted(conversationId: string, me: string, muted: boolean) {
  unwrap(
    await supabase
      .from("conversation_members")
      .update({ muted })
      .eq("conversation_id", conversationId)
      .eq("user_id", me)
      .select("id"),
  );
}

export async function leaveConversation(conversationId: string, me: string) {
  unwrap(
    await supabase
      .from("conversation_members")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", me)
      .select("id"),
  );
}

/* ---------------- messages ---------------- */

export const PAGE_SIZE = 40;

export async function listMessages(conversationId: string, before?: string) {
  let q = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (before) q = q.lt("created_at", before);
  const rows = (unwrap(await q) ?? []) as Message[];
  return rows.reverse();
}

export async function listReactions(conversationId: string) {
  const rows = (unwrap(
    await supabase
      .from("message_reactions")
      .select("id,message_id,user_id,emoji,messages!inner(conversation_id)")
      .eq("messages.conversation_id", conversationId),
  ) ?? []) as Array<Reaction & { messages: unknown }>;
  return rows.map(({ id, message_id, user_id, emoji }) => ({ id, message_id, user_id, emoji }));
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  type: MessageType;
  body?: string | null;
  mediaUrl?: string | null;
  mediaMeta?: Record<string, unknown>;
  replyTo?: string | null;
  forwardedFrom?: string | null;
}) {
  const message = unwrap(
    await supabase
      .from("messages")
      .insert({
        conversation_id: input.conversationId,
        sender_id: input.senderId,
        type: input.type,
        body: input.body ?? null,
        media_url: input.mediaUrl ?? null,
        media_meta: (input.mediaMeta ?? {}) as never,
        reply_to: input.replyTo ?? null,
        forwarded_from: input.forwardedFrom ?? null,
      })
      .select("*")
      .single(),
  ) as Message;
  return message;
}

export async function forwardMessage(input: {
  messageId: string;
  conversationId: string;
  senderId: string;
}) {
  const source = unwrap(
    await supabase.from("messages").select("*").eq("id", input.messageId).single(),
  ) as Message;

  return sendMessage({
    conversationId: input.conversationId,
    senderId: input.senderId,
    type: source.type,
    body: source.body,
    mediaUrl: source.media_url,
    mediaMeta: source.media_meta,
    forwardedFrom: source.id,
  });
}

export async function editMessage(id: string, body: string) {
  return unwrap(
    await supabase
      .from("messages")
      .update({ body, edited_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single(),
  ) as Message;
}

export async function deleteMessage(id: string) {
  return unwrap(
    await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString(), body: null, media_url: null })
      .eq("id", id)
      .select("*")
      .single(),
  ) as Message;
}

export async function setPinned(id: string, pinned: boolean) {
  return unwrap(
    await supabase.from("messages").update({ pinned }).eq("id", id).select("*").single(),
  ) as Message;
}

export async function toggleReaction(messageId: string, userId: string, emoji: string) {
  const existing = unwrap(
    await supabase
      .from("message_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .eq("emoji", emoji)
      .maybeSingle(),
  ) as { id: string } | null;
  if (existing) {
    unwrap(await supabase.from("message_reactions").delete().eq("id", existing.id).select("id"));
    return "removed" as const;
  }
  unwrap(
    await supabase
      .from("message_reactions")
      .insert({ message_id: messageId, user_id: userId, emoji })
      .select("id"),
  );
  return "added" as const;
}

export async function markConversationRead(conversationId: string, me: string) {
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", me);
}

export async function markMessagesRead(messageIds: string[], me: string) {
  if (messageIds.length === 0) return;
  await supabase.from("message_reads").upsert(
    messageIds.map((message_id) => ({ message_id, user_id: me })),
    { onConflict: "message_id,user_id", ignoreDuplicates: true },
  );
}

export async function listReads(conversationId: string) {
  const rows = (unwrap(
    await supabase
      .from("message_reads")
      .select("message_id,user_id,messages!inner(conversation_id)")
      .eq("messages.conversation_id", conversationId),
  ) ?? []) as Array<{ message_id: string; user_id: string }>;
  return rows;
}

/* ---------------- contacts ---------------- */

export async function listContacts(me: string) {
  const rows = (unwrap(await supabase.from("contacts").select("contact_id").eq("user_id", me)) ??
    []) as Array<{ contact_id: string }>;
  const profiles = await getProfilesByIds(rows.map((r) => r.contact_id));
  return profiles.sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export async function addContact(me: string, contactId: string) {
  unwrap(
    await supabase
      .from("contacts")
      .upsert({ user_id: me, contact_id: contactId }, { onConflict: "user_id,contact_id" })
      .select("id"),
  );
}

export async function removeContact(me: string, contactId: string) {
  unwrap(
    await supabase
      .from("contacts")
      .delete()
      .eq("user_id", me)
      .eq("contact_id", contactId)
      .select("id"),
  );
}

export async function searchProfiles(term: string, me: string) {
  const t = term.trim();
  if (!t) return [];
  const safeTerm = t.replace(/[^a-zA-Z0-9 _-]/g, " ").trim();
  if (!safeTerm) return [];
  const filters = [`display_name.ilike.%${safeTerm}%`, `username.ilike.%${safeTerm}%`];
  if (/^\d{6}$/.test(safeTerm)) filters.push(`ide.eq.${safeTerm}`);
  const withIde = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .or(filters.join(","))
    .neq("id", me)
    .limit(20);
  if (withIde.error && missingIdeColumn(withIde.error)) {
    const legacy = await supabase
      .from("profiles")
      .select(PROFILE_COLS_LEGACY)
      .or([`display_name.ilike.%${safeTerm}%`, `username.ilike.%${safeTerm}%`].join(","))
      .neq("id", me)
      .limit(20);
    if (legacy.error) throw new Error(legacy.error.message);
    return normalizeProfileRows(legacy.data);
  }
  if (withIde.error) throw new Error(withIde.error.message);
  return normalizeProfileRows(withIde.data);
}

export async function listBlocked(me: string) {
  const rows = (unwrap(
    await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", me),
  ) ?? []) as Array<{ blocked_id: string }>;
  return rows.map((r) => r.blocked_id);
}

export async function setBlocked(me: string, otherId: string, blocked: boolean) {
  if (blocked) {
    unwrap(
      await supabase
        .from("blocked_users")
        .upsert({ blocker_id: me, blocked_id: otherId }, { onConflict: "blocker_id,blocked_id" })
        .select("id"),
    );
  } else {
    unwrap(
      await supabase
        .from("blocked_users")
        .delete()
        .eq("blocker_id", me)
        .eq("blocked_id", otherId)
        .select("id"),
    );
  }
}

/* ---------------- stories ---------------- */

export async function listStories() {
  const rows = (unwrap(
    await supabase
      .from("stories")
      .select(`id,user_id,type,body,media_url,background,audience,created_at,expires_at`)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true }),
  ) ?? []) as Story[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  if (userIds.length === 0) return { stories: [] as Story[], authors: new Map<string, Profile>() };
  const authors = (unwrap(await supabase.from("profiles").select(PROFILE_COLS).in("id", userIds)) ??
    []) as Profile[];
  return { stories: rows, authors: new Map(authors.map((a) => [a.id, a])) };
}

export async function postStory(input: {
  userId: string;
  type: "text" | "image" | "video";
  body?: string | null;
  mediaUrl?: string | null;
  background?: string;
  audience?: "everyone" | "contacts" | "close_friends";
}) {
  unwrap(
    await supabase
      .from("stories")
      .insert({
        user_id: input.userId,
        type: input.type,
        body: input.body ?? null,
        media_url: input.mediaUrl ?? null,
        background: input.background ?? "aurora",
        audience: input.audience ?? "everyone",
      })
      .select("id"),
  );
}

export async function listStoryViews(me: string) {
  const rows = (unwrap(await supabase.from("story_views").select("story_id").eq("user_id", me)) ??
    []) as Array<{ story_id: string }>;
  return new Set(rows.map((r) => r.story_id));
}

export async function viewStory(storyId: string, me: string, reaction?: string) {
  unwrap(
    await supabase
      .from("story_views")
      .upsert(
        { story_id: storyId, user_id: me, reaction: reaction ?? null },
        { onConflict: "story_id,user_id" },
      )
      .select("id"),
  );
}

export async function deleteStory(id: string) {
  unwrap(await supabase.from("stories").delete().eq("id", id).select("id"));
}

export async function listStoryReplies(storyId: string) {
  return (unwrap(
    await supabase
      .from("story_replies")
      .select("id,story_id,user_id,body,created_at")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true })
      .limit(100),
  ) ?? []) as StoryReply[];
}

export async function replyToStory(storyId: string, userId: string, body: string) {
  return unwrap(
    await supabase
      .from("story_replies")
      .insert({ story_id: storyId, user_id: userId, body: body.trim() })
      .select("id,story_id,user_id,body,created_at")
      .single(),
  ) as StoryReply;
}

/* ---------------- notifications ---------------- */

export async function listNotifications(me: string) {
  return (unwrap(
    await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", me)
      .order("created_at", { ascending: false })
      .limit(100),
  ) ?? []) as Array<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    conversation_id: string | null;
    story_id: string | null;
    message_id: string | null;
    call_id: string | null;
    target_user_id: string | null;
    actor_id: string | null;
    read: boolean;
    created_at: string;
  }>;
}

export async function notify(input: {
  userIds: string[];
  actorId: string;
  type: string;
  title: string;
  body?: string | null;
  conversationId?: string | null;
}) {
  if (input.userIds.length === 0) return;
  await supabase.from("notifications").insert(
    input.userIds.map((user_id) => ({
      user_id,
      actor_id: input.actorId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      conversation_id: input.conversationId ?? null,
    })),
  );
}

export async function markNotificationRead(id: string, me: string) {
  unwrap(
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", me)
      .select("id"),
  );
}

export async function markNotificationsRead(me: string) {
  await supabase.from("notifications").update({ read: true }).eq("user_id", me).eq("read", false);
}

export async function deleteMyAccount() {
  unwrap(await supabase.rpc("delete_my_account"));
  await supabase.auth.signOut();
}

export async function exportMyAccount() {
  return unwrap(await supabase.rpc("export_my_account")) as Record<string, unknown>;
}

/* ---------------- calls ---------------- */

export async function createCallSession(input: {
  conversationId: string;
  calleeId: string;
  type: "voice" | "video";
}) {
  const data = unwrap(
    await supabase.rpc("create_call_session", {
      _conversation_id: input.conversationId,
      _callee: input.calleeId,
      _type: input.type,
    }),
  );
  return data as string;
}

export async function getCallSession(id: string) {
  const rows = (unwrap(await supabase.rpc("get_call_session", { _call_id: id })) ??
    []) as CallSession[];
  return rows[0] ?? null;
}

export async function listActiveCallSessions() {
  return (unwrap(await supabase.rpc("list_active_call_sessions")) ?? []) as CallSession[];
}

export async function acceptCallSession(id: string) {
  const rows = (unwrap(await supabase.rpc("accept_call_session", { _call_id: id })) ??
    []) as CallSession[];
  return rows[0] ?? null;
}

export async function setCallSessionStatus(id: string, status: "connecting" | "connected") {
  const rows = (unwrap(
    await supabase.rpc("set_call_session_status", { _call_id: id, _status: status }),
  ) ?? []) as CallSession[];
  return rows[0] ?? null;
}

export async function finishCallSession(
  id: string,
  status: Extract<CallSessionStatus, "declined" | "cancelled" | "missed" | "failed" | "ended">,
  durationSeconds = 0,
) {
  const rows = (unwrap(
    await supabase.rpc("finish_call_session", {
      _call_id: id,
      _status: status,
      _duration_seconds: durationSeconds,
    }),
  ) ?? []) as CallRecord[];
  return rows[0] ?? null;
}

export async function heartbeatCallSession(id: string) {
  return Boolean(unwrap(await supabase.rpc("heartbeat_call_session", { _call_id: id })));
}

export async function listCalls(me: string) {
  const rows = (unwrap(
    await supabase
      .from("calls")
      .select("id,caller_id,callee_id,type,status,duration_seconds,created_at")
      .or(`caller_id.eq.${me},callee_id.eq.${me}`)
      .order("created_at", { ascending: false })
      .limit(50),
  ) ?? []) as CallRecord[];
  const ids = [...new Set(rows.flatMap((r) => [r.caller_id, r.callee_id]))].filter((i) => i !== me);
  const profiles = ids.length
    ? ((unwrap(await supabase.from("profiles").select(PROFILE_COLS).in("id", ids)) ??
        []) as Profile[])
    : [];
  return { calls: rows, profiles: new Map(profiles.map((p) => [p.id, p])) };
}

export async function logCall(input: {
  callerId: string;
  calleeId: string;
  type: "voice" | "video";
  status: "missed" | "answered" | "declined";
  durationSeconds?: number;
  conversationId?: string | null;
}) {
  unwrap(
    await supabase
      .from("calls")
      .insert({
        caller_id: input.callerId,
        callee_id: input.calleeId,
        type: input.type,
        status: input.status,
        duration_seconds: input.durationSeconds ?? 0,
        conversation_id: input.conversationId ?? null,
      })
      .select("id"),
  );
}

/* ---------------- global search ---------------- */

export async function globalSearch(term: string, me: string) {
  const t = term.trim();
  if (t.length < 2) return { people: [] as Profile[], messages: [] as Message[] };
  const [people, messages] = await Promise.all([
    searchProfiles(t, me),
    supabase
      .from("messages")
      .select("*")
      .ilike("body", `%${t}%`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return { people, messages: (unwrap(messages) ?? []) as Message[] };
}
