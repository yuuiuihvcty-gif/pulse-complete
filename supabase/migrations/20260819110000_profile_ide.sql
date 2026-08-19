alter table public.profiles add column if not exists ide text;

-- Backfill existing profiles with collision-safe six-digit identifiers.
do $$
declare
  profile_row record;
  candidate text;
begin
  for profile_row in select id from public.profiles where ide is null loop
    loop
      candidate := lpad(floor(random() * 1000000)::int::text, 6, '0');
      exit when not exists (select 1 from public.profiles where ide = candidate);
    end loop;
    update public.profiles set ide = candidate where id = profile_row.id;
  end loop;
end $$;

alter table public.profiles
  alter column ide set not null;

alter table public.profiles
  drop constraint if exists profiles_ide_format_check;
alter table public.profiles
  add constraint profiles_ide_format_check check (ide ~ '^[0-9]{6}$');

create unique index if not exists profiles_ide_key on public.profiles (ide);

grant select (ide) on public.profiles to authenticated;

create or replace function public.next_profile_ide()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := lpad(floor(random() * 1000000)::int::text, 6, '0');
    exit when not exists (select 1 from public.profiles where ide = candidate);
  end loop;
  return candidate;
end;
$$;

grant execute on function public.next_profile_ide() to authenticated;
grant execute on function public.next_profile_ide() to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  uname text;
  n int := 0;
  profile_ide text;
begin
  base := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1), 'user'), '[^a-z0-9_]', '', 'g'));
  if base = '' then base := 'user'; end if;
  uname := base;
  while exists (select 1 from public.profiles where username = uname) loop
    n := n + 1;
    uname := base || n::text;
  end loop;
  profile_ide := public.next_profile_ide();
  insert into public.profiles (id, ide, username, display_name, avatar_url)
  values (
    NEW.id,
    profile_ide,
    uname,
    coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', uname),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_settings (user_id) values (NEW.id) on conflict do nothing;
  return NEW;
end;
$$;

revoke update (ide) on public.profiles from authenticated;
revoke insert (ide) on public.profiles from authenticated;
