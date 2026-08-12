import { supabase } from "@/integrations/supabase/client";
import type {
  CallRecord,
  ConversationSummary,
  Message,
  MessageType,
  Profile,
  Reaction,
  Story,
  UserSettings,
} from "@/lib/types";

const PROFILE_COLS = "id,username,display_name,avatar_url,about,phone,mood,is_online,last_seen";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ---------------- profiles & settings ---------------- */

export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  return (unwrap(await supabase.from("profiles").select(PROFILE_COLS).in("id", unique)) ??
    []) as Profile[];
}

export async function getProfile(id: string) {

  return unwrap(
    await supabase.from("profiles").select(PROFILE_COLS).eq("id", id).maybeSingle(),
  ) as Profile | null;
}

export async function updateProfile(id: string, patch: Partial<Profile>) {
  return unwrap(
    await supabase.from("profiles").update(patch).eq("id", id).select(PROFILE_COLS).single(),
  ) as Profile;
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
  const rows = unwrap(
    await supabase
      .from("conversation_members")
      .select("conversation_id,muted,last_read_at,conversations(*)")
      .eq("user_id", me),
  ) as Array<{
    conversation_id: string;
    muted: boolean;
    last_read_at: string;
    conversations: {
      id: string;
      is_group: boolean;
      name: string | null;
      avatar_url: string | null;
      last_message_at: string;
    } | null;
  }>;

  const ids = rows.map((r) => r.conversation_id);
  if (ids.length === 0) return [];

  const [others, messages] = await Promise.all([
    supabase
      .from("conversation_members")
      .select("conversation_id,user_id")
      .in("conversation_id", ids)
      .neq("user_id", me),
    supabase
      .from("messages")
      .select("*")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(600),
  ]);

  const otherRows = (unwrap(others) ?? []) as Array<{
    conversation_id: string;
    user_id: string;
  }>;
  const msgRows = (unwrap(messages) ?? []) as Message[];
  const profiles = await getProfilesByIds(otherRows.map((r) => r.user_id));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const otherByConv = new Map<string, Profile>();
  otherRows.forEach((r) => {
    const p = profileById.get(r.user_id);
    if (p && !otherByConv.has(r.conversation_id)) otherByConv.set(r.conversation_id, p);
  });


  const lastByConv = new Map<string, Message>();
  const unreadByConv = new Map<string, number>();
  const lastReadByConv = new Map(rows.map((r) => [r.conversation_id, r.last_read_at]));

  msgRows.forEach((m) => {
    if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
    const lastRead = lastReadByConv.get(m.conversation_id);
    if (m.sender_id !== me && lastRead && new Date(m.created_at) > new Date(lastRead)) {
      unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
    }
  });

  return rows
    .filter((r) => r.conversations)
    .map((r) => ({
      id: r.conversation_id,
      is_group: r.conversations!.is_group,
      name: r.conversations!.name,
      avatar_url: r.conversations!.avatar_url,
      last_message_at: r.conversations!.last_message_at,
      muted: r.muted,
      last_read_at: r.last_read_at,
      unread: unreadByConv.get(r.conversation_id) ?? 0,
      other: otherByConv.get(r.conversation_id) ?? null,
      lastMessage: lastByConv.get(r.conversation_id) ?? null,
    }))
    .sort((a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at));
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
      })
      .select("*")
      .single(),
  ) as Message;
  return message;
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
  await supabase
    .from("message_reads")
    .upsert(
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
  const rows = (unwrap(
    await supabase
      .from("profiles")
      .select(PROFILE_COLS)
      .or(`display_name.ilike.%${t}%,username.ilike.%${t}%`)
      .neq("id", me)
      .limit(20),
  ) ?? []) as Profile[];
  return rows;
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
      .select(`id,user_id,type,body,media_url,background,created_at,expires_at`)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true }),
  ) ?? []) as Story[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  if (userIds.length === 0) return { stories: [] as Story[], authors: new Map<string, Profile>() };
  const authors = (unwrap(
    await supabase.from("profiles").select(PROFILE_COLS).in("id", userIds),
  ) ?? []) as Profile[];
  return { stories: rows, authors: new Map(authors.map((a) => [a.id, a])) };
}

export async function postStory(input: {
  userId: string;
  type: "text" | "image" | "video";
  body?: string | null;
  mediaUrl?: string | null;
  background?: string;
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
      })
      .select("id"),
  );
}

export async function listStoryViews(me: string) {
  const rows = (unwrap(
    await supabase.from("story_views").select("story_id").eq("user_id", me),
  ) ?? []) as Array<{ story_id: string }>;
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

/* ---------------- notifications ---------------- */

export async function listNotifications(me: string) {
  return (unwrap(
    await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", me)
      .order("created_at", { ascending: false })
      .limit(50),
  ) ?? []) as Array<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    conversation_id: string | null;
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

export async function markNotificationsRead(me: string) {
  await supabase.from("notifications").update({ read: true }).eq("user_id", me).eq("read", false);
}

/* ---------------- calls ---------------- */

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
