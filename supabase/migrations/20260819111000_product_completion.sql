alter table public.notifications add column if not exists story_id uuid references public.stories(id) on delete cascade;
alter table public.notifications add column if not exists message_id uuid references public.messages(id) on delete cascade;
alter table public.notifications add column if not exists call_id uuid references public.calls(id) on delete cascade;
alter table public.notifications add column if not exists target_user_id uuid references auth.users(id) on delete cascade;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create table if not exists public.story_replies (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.story_replies to authenticated;
grant all on public.story_replies to service_role;
alter table public.story_replies enable row level security;
create policy "story_replies_select_visible" on public.story_replies for select to authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.expires_at > now()));
create policy "story_replies_insert_own" on public.story_replies for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.stories s where s.id = story_id and s.expires_at > now()));
create policy "story_replies_update_own" on public.story_replies for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "story_replies_delete_own" on public.story_replies for delete to authenticated
  using (user_id = auth.uid());

alter table public.stories add column if not exists audience text not null default 'everyone';
alter table public.stories add constraint stories_audience_check check (audience in ('everyone', 'contacts', 'close_friends'));

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;
grant execute on function public.delete_my_account() to authenticated;

create or replace function public.export_my_account()
returns jsonb
language sql
security definer
set search_path = public
as $$
select jsonb_build_object(
  'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
  'settings', (select to_jsonb(s) from public.user_settings s where s.user_id = auth.uid()),
  'contacts', coalesce((select jsonb_agg(to_jsonb(c)) from public.contacts c where c.user_id = auth.uid()), '[]'::jsonb),
  'stories', coalesce((select jsonb_agg(to_jsonb(s)) from public.stories s where s.user_id = auth.uid()), '[]'::jsonb)
);
$$;
grant execute on function public.export_my_account() to authenticated;
