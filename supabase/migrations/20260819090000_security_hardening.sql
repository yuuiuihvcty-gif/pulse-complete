-- Pulse security hardening
-- This migration is additive and intentionally does not rewrite published history.

-- Conversation membership updates may only change per-member preferences/read state.
CREATE OR REPLACE FUNCTION public.prevent_conversation_member_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.conversation_id <> OLD.conversation_id
     OR NEW.user_id <> OLD.user_id
     OR NEW.joined_at <> OLD.joined_at THEN
    RAISE EXCEPTION 'conversation membership identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversation_members_identity_guard ON public.conversation_members;
CREATE TRIGGER conversation_members_identity_guard
  BEFORE UPDATE ON public.conversation_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_conversation_member_identity_change();

DROP POLICY IF EXISTS "conv_update_member" ON public.conversations;
CREATE POLICY "conv_update_owner" ON public.conversations
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "cm_insert" ON public.conversation_members;
CREATE POLICY "cm_insert_owner" ON public.conversation_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.owns_conversation(conversation_id, auth.uid())
    AND user_id <> auth.uid()
  );

DROP POLICY IF EXISTS "msg_update" ON public.messages;
CREATE POLICY "msg_update_sender" ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- A client may only create a notification for a conversation participant, and
-- only when the authenticated actor is the caller. System-generated notices
-- should be written through a trusted server-side function, not the browser.
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
CREATE POLICY "notif_insert_participant" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      user_id = auth.uid()
      OR (
        conversation_id IS NOT NULL
        AND public.is_member(conversation_id, auth.uid())
        AND public.is_member(conversation_id, user_id)
      )
    )
  );

-- Story viewers may only see their own view records or views on stories they own.
DROP POLICY IF EXISTS "sv_select" ON public.story_views;
CREATE POLICY "sv_select_author_or_viewer" ON public.story_views
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_id AND s.user_id = auth.uid()
    )
  );

-- Calls are only valid inside a conversation shared by the parties. The
-- caller/callee IDs and conversation cannot be changed by the callee later.
CREATE OR REPLACE FUNCTION public.prevent_call_party_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.caller_id <> OLD.caller_id
     OR NEW.callee_id <> OLD.callee_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    RAISE EXCEPTION 'call parties are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calls_party_guard ON public.calls;
CREATE TRIGGER calls_party_guard
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_call_party_change();

DROP POLICY IF EXISTS "calls_insert_caller" ON public.calls;
CREATE POLICY "calls_insert_caller_participant" ON public.calls
  FOR INSERT TO authenticated
  WITH CHECK (
    caller_id = auth.uid()
    AND callee_id <> auth.uid()
    AND (
      conversation_id IS NULL
      OR (
        public.is_member(conversation_id, auth.uid())
        AND public.is_member(conversation_id, callee_id)
      )
    )
  );

-- Prevent direct creation of a conversation with a user who has blocked the
-- caller or is blocked by the caller.
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(_other uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  cid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _other = me THEN RAISE EXCEPTION 'cannot chat with yourself'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = me AND blocked_id = _other)
       OR (blocker_id = _other AND blocked_id = me)
  ) THEN
    RAISE EXCEPTION 'conversation unavailable';
  END IF;

  SELECT c.id INTO cid
  FROM public.conversations c
  JOIN public.conversation_members a
    ON a.conversation_id = c.id AND a.user_id = me
  JOIN public.conversation_members b
    ON b.conversation_id = c.id AND b.user_id = _other
  WHERE c.is_group = false
  LIMIT 1;

  IF cid IS NOT NULL THEN RETURN cid; END IF;

  INSERT INTO public.conversations (is_group, created_by)
  VALUES (false, me)
  RETURNING id INTO cid;

  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (cid, me), (cid, _other);
  RETURN cid;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_conversation_member_identity_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_call_party_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;

-- Storage reads are restricted to the uploader's folder or a message attachment
-- belonging to a conversation the current user participates in. Upload/update/
-- delete ownership policies remain enforced by the earlier migrations.
DROP POLICY IF EXISTS "media_read_authenticated" ON storage.objects;
CREATE POLICY "media_read_authorized" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.messages m
        WHERE m.media_url = name
          AND public.is_member(m.conversation_id, auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.stories s
        WHERE s.media_url = name
          AND s.expires_at > now()
      )
    )
  );
