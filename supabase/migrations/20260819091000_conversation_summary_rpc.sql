-- Keep chat-list reads bounded by conversation count rather than message count.
CREATE INDEX IF NOT EXISTS messages_conversation_sender_created_idx
  ON public.messages (conversation_id, sender_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.list_conversation_summaries()
RETURNS TABLE (
  conversation_id uuid,
  is_group boolean,
  name text,
  avatar_url text,
  last_message_at timestamptz,
  muted boolean,
  last_read_at timestamptz,
  unread bigint,
  last_message jsonb,
  other_user_id uuid
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    mine.conversation_id,
    c.is_group,
    c.name,
    c.avatar_url,
    c.last_message_at,
    mine.muted,
    mine.last_read_at,
    COALESCE(unread.count, 0)::bigint AS unread,
    latest.message AS last_message,
    other_member.user_id AS other_user_id
  FROM public.conversation_members mine
  JOIN public.conversations c ON c.id = mine.conversation_id
  LEFT JOIN LATERAL (
    SELECT to_jsonb(m) AS message
    FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) latest ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS count
    FROM public.messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id <> auth.uid()
      AND m.created_at > mine.last_read_at
  ) unread ON true
  LEFT JOIN LATERAL (
    SELECT cm.user_id
    FROM public.conversation_members cm
    WHERE cm.conversation_id = c.id
      AND cm.user_id <> auth.uid()
    ORDER BY cm.joined_at ASC
    LIMIT 1
  ) other_member ON true
  WHERE mine.user_id = auth.uid()
  ORDER BY c.last_message_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_conversation_summaries() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_conversation_summaries() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_conversation_summaries() TO authenticated;
