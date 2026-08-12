REVOKE EXECUTE ON FUNCTION public.is_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_conversation(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_see_message(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;

CREATE POLICY "media_read_authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media');
CREATE POLICY "media_insert_own_folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid()) WITH CHECK (bucket_id = 'media' AND owner = auth.uid());
CREATE POLICY "media_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid());