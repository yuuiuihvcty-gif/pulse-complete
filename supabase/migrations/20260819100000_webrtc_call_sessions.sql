-- Durable call lifecycle for WebRTC signaling and incoming-call recovery.
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('voice', 'video')),
  status text NOT NULL DEFAULT 'ringing' CHECK (
    status IN ('ringing', 'accepted', 'connecting', 'connected', 'declined', 'cancelled', 'missed', 'failed', 'ended')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  connected_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '35 seconds'),
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT call_sessions_different_participants CHECK (caller_id <> callee_id)
);

ALTER TABLE public.calls ADD COLUMN call_session_id uuid REFERENCES public.call_sessions(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX calls_call_session_id_unique ON public.calls(call_session_id) WHERE call_session_id IS NOT NULL;
CREATE INDEX call_sessions_participant_status_idx
  ON public.call_sessions (caller_id, callee_id, status, created_at DESC);
CREATE INDEX call_sessions_expiry_idx ON public.call_sessions (expires_at) WHERE status IN ('ringing', 'accepted', 'connecting', 'connected');

GRANT SELECT ON public.call_sessions TO authenticated;
GRANT ALL ON public.call_sessions TO service_role;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "call_sessions_select_party" ON public.call_sessions
  FOR SELECT TO authenticated
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_call_session(
  _conversation_id uuid,
  _callee uuid,
  _type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  session_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _callee = me THEN RAISE EXCEPTION 'cannot call yourself'; END IF;
  IF _type NOT IN ('voice', 'video') THEN RAISE EXCEPTION 'unsupported call type'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = me
  ) OR NOT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _callee
  ) THEN
    RAISE EXCEPTION 'call participants must belong to the conversation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = me AND blocked_id = _callee)
       OR (blocker_id = _callee AND blocked_id = me)
  ) THEN
    RAISE EXCEPTION 'call is not allowed';
  END IF;
  UPDATE public.call_sessions
     SET status = 'cancelled', ended_at = now()
   WHERE (caller_id = me OR callee_id = me OR caller_id = _callee OR callee_id = _callee)
     AND status IN ('ringing', 'accepted', 'connecting', 'connected')
     AND expires_at <= now();
  INSERT INTO public.call_sessions (conversation_id, caller_id, callee_id, type)
  VALUES (_conversation_id, me, _callee, _type)
  RETURNING id INTO session_id;
  RETURN session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_call_session(_call_id uuid)
RETURNS SETOF public.call_sessions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.call_sessions
   WHERE id = _call_id
     AND (caller_id = auth.uid() OR callee_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.list_active_call_sessions()
RETURNS SETOF public.call_sessions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.call_sessions
   WHERE (caller_id = auth.uid() OR callee_id = auth.uid())
     AND status IN ('ringing', 'accepted', 'connecting', 'connected')
     AND expires_at > now()
   ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.accept_call_session(_call_id uuid)
RETURNS SETOF public.call_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.call_sessions
     SET status = 'accepted', accepted_at = COALESCE(accepted_at, now()), last_heartbeat_at = now()
   WHERE id = _call_id
     AND callee_id = auth.uid()
     AND status = 'ringing'
     AND expires_at > now()
   RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_call_session_status(_call_id uuid, _status text)
RETURNS SETOF public.call_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _status NOT IN ('connecting', 'connected') THEN RAISE EXCEPTION 'invalid status transition'; END IF;
  RETURN QUERY
  UPDATE public.call_sessions
     SET status = _status,
         connected_at = CASE WHEN _status = 'connected' THEN COALESCE(connected_at, now()) ELSE connected_at END,
         last_heartbeat_at = now()
   WHERE id = _call_id
     AND (caller_id = auth.uid() OR callee_id = auth.uid())
     AND status IN ('accepted', 'connecting', 'connected')
     AND expires_at > now()
   RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_call_session(
  _call_id uuid,
  _status text,
  _duration_seconds integer DEFAULT 0
)
RETURNS SETOF public.calls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_row public.call_sessions;
  history_row public.calls;
BEGIN
  IF _status NOT IN ('declined', 'cancelled', 'missed', 'failed', 'ended') THEN
    RAISE EXCEPTION 'invalid final call status';
  END IF;
  SELECT * INTO session_row FROM public.call_sessions
   WHERE id = _call_id
     AND (caller_id = auth.uid() OR callee_id = auth.uid())
   FOR UPDATE;
  IF session_row.id IS NULL THEN RAISE EXCEPTION 'call session not found'; END IF;

  UPDATE public.call_sessions
     SET status = _status, ended_at = COALESCE(ended_at, now()), last_heartbeat_at = now()
   WHERE id = _call_id;

  INSERT INTO public.calls (
    call_session_id, conversation_id, caller_id, callee_id, type, status, duration_seconds
  ) VALUES (
    _call_id, session_row.conversation_id, session_row.caller_id, session_row.callee_id,
    session_row.type, CASE WHEN _status = 'ended' THEN 'answered' ELSE _status END,
    GREATEST(COALESCE(_duration_seconds, 0), 0)
  )
  ON CONFLICT (call_session_id) DO UPDATE
    SET status = EXCLUDED.status, duration_seconds = EXCLUDED.duration_seconds
  RETURNING * INTO history_row;
  RETURN NEXT history_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_call_session(_call_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.call_sessions
     SET last_heartbeat_at = now()
   WHERE id = _call_id
     AND (caller_id = auth.uid() OR callee_id = auth.uid())
     AND status IN ('accepted', 'connecting', 'connected')
     AND expires_at > now()
  RETURNING true;
$$;

GRANT EXECUTE ON FUNCTION public.create_call_session(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_active_call_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_call_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_call_session_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_call_session(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_call_session(uuid) TO authenticated;

-- Realtime authorization for private per-user invitation and per-call signaling topics.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pulse_call_user_topic_select" ON realtime.messages
  FOR SELECT TO authenticated
  USING (topic = 'user:' || auth.uid()::text || ':calls');
CREATE POLICY "pulse_call_user_topic_insert" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (topic = 'user:' || auth.uid()::text || ':calls');
CREATE POLICY "pulse_call_session_topic_select" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.call_sessions s
       WHERE topic = 'call:' || s.id::text
         AND (s.caller_id = auth.uid() OR s.callee_id = auth.uid())
    )
  );
CREATE POLICY "pulse_call_session_topic_insert" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.call_sessions s
       WHERE topic = 'call:' || s.id::text
         AND (s.caller_id = auth.uid() OR s.callee_id = auth.uid())
    )
  );
