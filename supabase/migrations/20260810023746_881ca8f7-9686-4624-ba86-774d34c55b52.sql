-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  about text DEFAULT 'Available',
  phone text,
  mood text,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- auto profile + settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text; uname text; n int := 0;
BEGIN
  base := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1), 'user'), '[^a-z0-9_]', '', 'g'));
  IF base = '' THEN base := 'user'; END IF;
  uname := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = uname) LOOP
    n := n + 1; uname := base || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, uname,
    coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', uname),
    NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

-- SETTINGS
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'system',
  wallpaper text NOT NULL DEFAULT 'aurora',
  bubble_style text NOT NULL DEFAULT 'soft',
  enter_to_send boolean NOT NULL DEFAULT true,
  media_autodownload boolean NOT NULL DEFAULT true,
  notif_messages boolean NOT NULL DEFAULT true,
  notif_sound boolean NOT NULL DEFAULT true,
  notif_vibrate boolean NOT NULL DEFAULT true,
  show_last_seen boolean NOT NULL DEFAULT true,
  show_online boolean NOT NULL DEFAULT true,
  read_receipts boolean NOT NULL DEFAULT true,
  photo_visibility text NOT NULL DEFAULT 'everyone',
  status_visibility text NOT NULL DEFAULT 'contacts',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_own" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CONTACTS
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, contact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_own" ON public.contacts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BLOCKED
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocked_own" ON public.blocked_users FOR ALL TO authenticated USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  name text,
  avatar_url text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted boolean NOT NULL DEFAULT false,
  last_read_at timestamptz NOT NULL DEFAULT '1970-01-01',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;

CREATE OR REPLACE FUNCTION public.is_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.owns_conversation(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations WHERE id = _conversation_id AND created_by = _user_id);
$$;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_select_member" ON public.conversations FOR SELECT TO authenticated
  USING (public.is_member(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "conv_insert_own" ON public.conversations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "conv_update_member" ON public.conversations FOR UPDATE TO authenticated
  USING (public.is_member(id, auth.uid())) WITH CHECK (public.is_member(id, auth.uid()));

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_select_member" ON public.conversation_members FOR SELECT TO authenticated
  USING (public.is_member(conversation_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "cm_insert" ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (public.owns_conversation(conversation_id, auth.uid()) OR public.is_member(conversation_id, auth.uid()));
CREATE POLICY "cm_update_own" ON public.conversation_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "cm_delete_own" ON public.conversation_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'text',
  body text,
  media_url text,
  media_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  pinned boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_created_idx ON public.messages (conversation_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_select_member" ON public.messages FOR SELECT TO authenticated USING (public.is_member(conversation_id, auth.uid()));
CREATE POLICY "msg_insert_member" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_member(conversation_id, auth.uid()));
CREATE POLICY "msg_update" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR public.is_member(conversation_id, auth.uid()))
  WITH CHECK (sender_id = auth.uid() OR public.is_member(conversation_id, auth.uid()));
CREATE POLICY "msg_delete_own" ON public.messages FOR DELETE TO authenticated USING (sender_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_conversation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER messages_bump AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.bump_conversation();

-- REACTIONS
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_see_message(_message_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
    WHERE m.id = _message_id AND cm.user_id = _user_id);
$$;
CREATE POLICY "react_select" ON public.message_reactions FOR SELECT TO authenticated USING (public.can_see_message(message_id, auth.uid()));
CREATE POLICY "react_insert_own" ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_see_message(message_id, auth.uid()));
CREATE POLICY "react_delete_own" ON public.message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- READS
CREATE TABLE public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reads TO authenticated;
GRANT ALL ON public.message_reads TO service_role;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reads_select" ON public.message_reads FOR SELECT TO authenticated USING (public.can_see_message(message_id, auth.uid()));
CREATE POLICY "reads_insert_own" ON public.message_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_see_message(message_id, auth.uid()));

-- STORIES
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'text',
  body text,
  media_url text,
  background text DEFAULT 'aurora',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories_select_all" ON public.stories FOR SELECT TO authenticated USING (expires_at > now());
CREATE POLICY "stories_own_write" ON public.stories FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "stories_own_delete" ON public.stories FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_views TO authenticated;
GRANT ALL ON public.story_views TO service_role;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sv_select" ON public.story_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "sv_insert_own" ON public.story_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sv_update_own" ON public.story_views FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() OR user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- CALLS
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'voice',
  status text NOT NULL DEFAULT 'missed',
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calls TO authenticated;
GRANT ALL ON public.calls TO service_role;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls_select_party" ON public.calls FOR SELECT TO authenticated USING (caller_id = auth.uid() OR callee_id = auth.uid());
CREATE POLICY "calls_insert_caller" ON public.calls FOR INSERT TO authenticated WITH CHECK (caller_id = auth.uid());
CREATE POLICY "calls_update_party" ON public.calls FOR UPDATE TO authenticated USING (caller_id = auth.uid() OR callee_id = auth.uid()) WITH CHECK (caller_id = auth.uid() OR callee_id = auth.uid());

-- REALTIME
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.message_reads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;

-- Direct conversation finder / creator
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(_other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); cid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _other = me THEN RAISE EXCEPTION 'cannot chat with yourself'; END IF;
  SELECT c.id INTO cid FROM public.conversations c
    JOIN public.conversation_members a ON a.conversation_id = c.id AND a.user_id = me
    JOIN public.conversation_members b ON b.conversation_id = c.id AND b.user_id = _other
   WHERE c.is_group = false
   LIMIT 1;
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  INSERT INTO public.conversations (is_group, created_by) VALUES (false, me) RETURNING id INTO cid;
  INSERT INTO public.conversation_members (conversation_id, user_id) VALUES (cid, me), (cid, _other);
  RETURN cid;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;