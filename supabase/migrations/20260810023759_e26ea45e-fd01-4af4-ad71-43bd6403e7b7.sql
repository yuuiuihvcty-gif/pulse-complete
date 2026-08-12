REVOKE EXECUTE ON FUNCTION public.is_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_conversation(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_see_message(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;