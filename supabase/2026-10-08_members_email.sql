-- =====================================================================
-- v117 (2026-10-08) 회원 시스템 개편 — 이메일 로그인 · 가입 승인 · 계정 등급
-- Supabase → SQL Editor 에 이 파일 전체를 붙여 넣고 한 번 실행하세요. (여러 번 실행해도 됩니다)
--
--   로그인은 구글 → 이메일 + 비밀번호. 누구나 가입 신청을 할 수 있고,
--   마스터 · 슈퍼마스터가 승인해야 로그인할 수 있다.
--
--   계정 등급 (profiles.app_role)
--   · super   슈퍼마스터 — 마스터의 모든 권한 + 마스터 강등 · 탈퇴 · 비밀번호 재설정
--   · master  마스터     — 모든 광고주 · 캠페인 열람 · 수정 · 삭제, 가입 승인(뷰어/마스터),
--                          뷰어 → 마스터 승격, 뷰어의 광고주 지정 · 탈퇴
--                          (마스터끼리는 서로 볼 수만 있고 강등 · 탈퇴는 슈퍼마스터만)
--   · viewer  뷰어       — 마스터가 지정한 광고주의 캠페인만 열람
--   · pending 승인 대기   — 아무것도 볼 수 없다
--   · guest   (구글 로그인 시절의 미승인 계정 — 이 파일이 pending 으로 옮긴다)
--
--   예전의 캠페인 단위 권한(campaign_members 의 마스터 · 운영진 · 광고주, 초대)은 더 이상 권한을 주지 않는다.
--   표는 지우지 않고 기록으로 남긴다. 뷰어 코드 · 운영진 코드(로그인 없이 여는 공유 링크)는 그대로 둔다.
--
--   ⚠ 실행 전에 Authentication → Sign In / Providers 에서 "Confirm email" 을 꺼 주세요.
--     (가입 승인을 마스터가 하므로 메일 확인이 필요 없고, Supabase 기본 메일 서버는 프로젝트 팀원에게만 메일을 보낸다)
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. 계정 등급 · 가입 정보
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists note        text not null default '';
alter table public.profiles add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists approved_at timestamptz;
alter table public.profiles drop constraint if exists profiles_app_role_chk;
alter table public.profiles add  constraint profiles_app_role_chk
  check (app_role in ('super','master','viewer','pending','guest'));
alter table public.profiles alter column app_role set default 'pending';

-- 뷰어가 볼 수 있는 광고주 — 광고주 이름 열쇠(adv_key: 앞뒤 공백 · 대소문자 무시)로 캠페인과 맞춘다
create table if not exists public.viewer_advertisers(
  user_id    uuid not null references auth.users(id) on delete cascade,
  adv_key    text not null,
  adv        text not null,                 -- 화면에 보일 광고주 이름
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, adv_key)
);
alter table public.viewer_advertisers enable row level security;

-- 탈퇴(계정 삭제) 때 막히지 않도록 — 계정을 가리키는 열(만든 사람 · 고친 사람 등)은 비운다
do $$
declare r record; col text;
begin
  for r in select c.conname, c.conrelid::regclass as tbl, c.conkey
             from pg_constraint c
            where c.confrelid = 'auth.users'::regclass
              and c.connamespace = 'public'::regnamespace
              and c.contype = 'f' and c.confdeltype = 'a'
              and array_length(c.conkey,1) = 1
  loop
    select a.attname into col from pg_attribute a where a.attrelid = r.tbl and a.attnum = r.conkey[1];
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references auth.users(id) on delete set null',
                   r.tbl, r.conname, col);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. 권한 판정 — 예전 함수 이름(is_member · can_edit · is_master)을 그대로 쓰는
--    다른 정책 · 함수(전체 캠페인 · 코드 열기 등)가 새 규칙을 따르도록 내용만 바꾼다
-- ---------------------------------------------------------------------
create or replace function public.adv_key(a text)
returns text language sql immutable set search_path = public as $$
  select nullif(lower(regexp_replace(btrim(coalesce(a,'')), '\s+', ' ', 'g')), '');
$$;

create or replace function public.is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.app_role = 'super');
$$;
create or replace function public.is_app_master()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.app_role in ('super','master'));
$$;
create or replace function public.my_app_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select p.app_role from public.profiles p where p.id = auth.uid()), 'pending');
$$;

-- 이 광고주를 볼 수 있는가 — 마스터 이상은 전부, 뷰어는 지정받은 광고주만
create or replace function public.can_view_adv(a text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_master()
      or exists(select 1
                  from public.viewer_advertisers v
                  join public.profiles p on p.id = v.user_id and p.app_role = 'viewer'
                 where v.user_id = auth.uid()
                   and v.adv_key = public.adv_key(a));
$$;
-- 이 캠페인을 볼 수 있는가
create or replace function public.is_member(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_master()
      or exists(select 1 from public.campaigns t where t.id = c and public.can_view_adv(t.advertiser));
$$;
-- 내가 볼 수 있는 캠페인 id 목록 — 일별 실적처럼 행이 많은 표에서 행마다 판정하지 않도록 한 번에 만든다
-- (행마다 is_member() 를 부르면 뷰어의 실적 조회가 수십 초 걸릴 수 있다)
create or replace function public.my_campaign_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(t.id), '{}'::uuid[])
    from public.campaigns t
   where public.is_app_master() or public.can_view_adv(t.advertiser);
$$;
-- 수정 · 캠페인 관리 — 마스터 이상
create or replace function public.can_edit(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_master();
$$;
create or replace function public.is_master(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_master();
$$;
-- 트렌드 리포트 게시판 관리 — 마스터 이상
create or replace function public.trend_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_master();
$$;

-- ---------------------------------------------------------------------
-- 3. 정책 (RLS) — 같은 이름으로 덮어쓴다
--    (select …) 로 감싼 판정은 문장마다 한 번만 계산된다 (일별 실적처럼 행이 많은 표에서 빠르게)
-- ---------------------------------------------------------------------
-- 캠페인
drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns for select to authenticated
  using ((select public.is_app_master()) or public.can_view_adv(advertiser));
drop policy if exists campaigns_insert on public.campaigns;
create policy campaigns_insert on public.campaigns for insert to authenticated
  with check ((select public.is_app_master()) and created_by = auth.uid());
drop policy if exists campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns for update to authenticated
  using ((select public.is_app_master())) with check ((select public.is_app_master()));
drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns for delete to authenticated
  using ((select public.is_app_master()));

-- 일별 실적
drop policy if exists stats_select on public.daily_stats;
create policy stats_select on public.daily_stats for select to authenticated
  using ((select public.is_app_master()) or campaign_id = any((select public.my_campaign_ids())::uuid[]));
drop policy if exists stats_write on public.daily_stats;
create policy stats_write on public.daily_stats for all to authenticated
  using ((select public.is_app_master())) with check ((select public.is_app_master()));

-- 저장 이력
drop policy if exists history_select on public.campaign_history;
create policy history_select on public.campaign_history for select to authenticated
  using ((select public.is_app_master()) or campaign_id = any((select public.my_campaign_ids())::uuid[]));
drop policy if exists history_insert on public.campaign_history;
create policy history_insert on public.campaign_history for insert to authenticated
  with check ((select public.is_app_master()));

-- 예전 캠페인 단위 멤버 · 초대 — 이제 권한을 주지 않는다 (기록만, 마스터 이상이 본다)
drop policy if exists members_select on public.campaign_members;
create policy members_select on public.campaign_members for select to authenticated
  using (user_id = auth.uid() or (select public.is_app_master()));
drop policy if exists members_write on public.campaign_members;
create policy members_write on public.campaign_members for all to authenticated
  using ((select public.is_app_master())) with check ((select public.is_app_master()));
drop policy if exists invites_select on public.campaign_invites;
create policy invites_select on public.campaign_invites for select to authenticated
  using ((select public.is_app_master()));
drop policy if exists invites_write on public.campaign_invites;
create policy invites_write on public.campaign_invites for all to authenticated
  using ((select public.is_app_master())) with check ((select public.is_app_master()));

-- 프로필 — 본인 것, 마스터 이상은 전부 (마스터끼리 서로 볼 수 있다)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or (select public.is_app_master()));
drop policy if exists profiles_upsert on public.profiles;
create policy profiles_upsert on public.profiles for insert to authenticated
  with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 뷰어 광고주 — 본인 것, 마스터 이상은 전부. 쓰기는 아래 함수로만
drop policy if exists va_select on public.viewer_advertisers;
create policy va_select on public.viewer_advertisers for select to authenticated
  using (user_id = auth.uid() or (select public.is_app_master()));

-- 캠페인의 공유 코드(share_code · staff_code)는 마스터 이상만 — 표 열 권한으로 막고, 마스터는 함수로 받는다.
-- (뷰어가 코드를 모아 두면 탈퇴하거나 광고주가 바뀐 뒤에도 로그인 없이 코드로 계속 볼 수 있었다)
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'campaigns'
     and column_name not in ('share_code','staff_code');
  execute 'revoke select on public.campaigns from anon, authenticated';
  execute format('grant select (%s) on public.campaigns to authenticated', cols);
end $$;
-- 새 캠페인의 코드 기본값(gen_share_code)은 겹치는 코드가 있는지 표를 읽는다 — 이제 코드 열은 직접 읽을 수 없으므로
-- 함수 주인 권한으로 돌게 한다 (안 그러면 마스터도 캠페인을 만들 수 없다)
create or replace function public.gen_share_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  alphabet text := 'ACDEFGHJKLMNPQRTUVWXY34679';
  out text := '';
  i int;
begin
  loop
    out := '';
    for i in 1..8 loop
      out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    out := substr(out,1,4) || '-' || substr(out,5,4);
    exit when not exists (select 1 from public.campaigns c where c.share_code = out or c.staff_code = out);
  end loop;
  return out;
end $$;
revoke all on function public.gen_share_code() from public, anon;
grant execute on function public.gen_share_code() to authenticated;
create or replace function public.campaign_codes()
returns table(id uuid, share_code text, staff_code text)
language sql stable security definer set search_path = public as $$
  select c.id, c.share_code, c.staff_code from public.campaigns c where public.is_app_master();
$$;

-- 리포트용 뷰도 RLS 를 따르게 — 예전에는 뷰 주인 권한으로 돌아 모든 캠페인 집계가 보였다
do $$ begin
  if to_regclass('public.v_daily_by_media') is not null then
    execute 'alter view public.v_daily_by_media set (security_invoker = on)';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. 프로필 보호 — 사이트에서 직접 고치는 경우 등급 · 승인 정보 · 이메일은 바꿀 수 없다
--    (예전에는 로그인한 누구나 자기 등급을 super 로 바꿀 수 있었다)
--    아래 승인 함수들은 security definer 라 current_user 가 postgres 이므로 통과한다
-- ---------------------------------------------------------------------
create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated','anon') then
    if tg_op = 'INSERT' then
      new.app_role    := 'pending';
      new.approved_by := null;
      new.approved_at := null;
      new.email       := coalesce(nullif(auth.jwt()->>'email',''), new.email);
    else
      new.id          := old.id;
      new.app_role    := old.app_role;
      new.approved_by := old.approved_by;
      new.approved_at := old.approved_at;
      new.email       := old.email;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- 가입(계정 생성) → 승인 대기 프로필. 이름 · 소속 · 신청 메모는 가입 양식에서 받은 값
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, name, org, note, avatar_url, app_role)
  values (new.id, new.email,
          coalesce(nullif(btrim(new.raw_user_meta_data->>'name'),''),
                   nullif(btrim(new.raw_user_meta_data->>'full_name'),''),
                   split_part(new.email,'@',1)),
          coalesce(btrim(new.raw_user_meta_data->>'org'),''),
          coalesce(btrim(new.raw_user_meta_data->>'note'),''),
          new.raw_user_meta_data->>'avatar_url',
          'pending')
  on conflict (id) do nothing;
  return new;
end $$;

-- 로그인 이메일이 바뀌면 프로필 이메일도 따라간다 (회원 목록 · 승인 화면이 실제 로그인 이메일을 보이게)
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end $$;
do $$ begin
  drop trigger if exists on_auth_user_email on auth.users;
  create trigger on_auth_user_email after update of email on auth.users
    for each row execute function public.sync_profile_email();
exception when insufficient_privilege then
  raise notice 'auth.users 에 트리거를 만들 권한이 없어 이메일 동기화는 건너뜁니다 (회원 목록은 로그인 이메일을 직접 읽는다)';
end $$;

-- 일별 실적 '고친 사람' 자동 기록 — 계정을 지울 때(외래 키가 비우는 경우)는 손대지 않는다.
-- (예전에는 탈퇴시킨 사람의 기록이 탈퇴시킨 마스터 이름으로 바뀌었다)
create or replace function public.touch_daily_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. 회원 관리 함수 (사이트의 회원 관리 화면이 부른다)
-- ---------------------------------------------------------------------
-- 승인 대기 수 — 마스터 이상에게만 (우측 상단 알림)
create or replace function public.pending_count()
returns integer language sql stable security definer set search_path = public as $$
  select case when public.is_app_master()
              then (select count(*)::int from public.profiles where app_role in ('pending'))
              else 0 end;
$$;

-- 회원 목록 — 마스터 이상
drop function if exists public.list_members();
create or replace function public.list_members()
returns table(id uuid, email text, name text, org text, note text, app_role text,
              created_at timestamptz, approved_at timestamptz, approved_by_name text,
              last_sign_in_at timestamptz, advs jsonb)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(u.email, p.email), p.name, p.org, p.note, p.app_role, p.created_at, p.approved_at,
         (select coalesce(nullif(a.name,''), a.email) from public.profiles a where a.id = p.approved_by),
         u.last_sign_in_at,
         coalesce((select jsonb_agg(v.adv order by v.adv) from public.viewer_advertisers v where v.user_id = p.id),
                  '[]'::jsonb)
    from public.profiles p
    left join auth.users u on u.id = p.id
   where public.is_app_master()
   order by case p.app_role when 'pending' then 0 when 'super' then 1 when 'master' then 2
                            when 'viewer' then 3 else 4 end,
            p.created_at desc;
$$;

-- (내부) 뷰어 광고주 목록을 통째로 바꾼다
create or replace function public._set_viewer_advs(p_user uuid, p_advs text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.viewer_advertisers where user_id = p_user;
  insert into public.viewer_advertisers(user_id, adv_key, adv, created_by)
  select p_user, public.adv_key(a), min(btrim(a)), auth.uid()
    from unnest(coalesce(p_advs, '{}'::text[])) a
   where public.adv_key(a) is not null
   group by public.adv_key(a)
  on conflict do nothing;
end $$;

-- 가입 승인 — 뷰어(광고주 지정) 또는 마스터로
create or replace function public.approve_member(p_user uuid, p_role text, p_advs text[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if not public.is_app_master() then raise exception '권한이 없습니다'; end if;
  if p_role not in ('viewer','master') then raise exception '허용되지 않는 등급입니다'; end if;
  select app_role into cur from public.profiles where id = p_user for update;
  if cur is null then raise exception '계정을 찾지 못했습니다'; end if;
  if cur not in ('pending','guest') then raise exception '이미 처리된 가입 요청입니다'; end if;
  update public.profiles set app_role = p_role, approved_by = auth.uid(), approved_at = now() where id = p_user;
  perform public._set_viewer_advs(p_user, case when p_role = 'viewer' then p_advs else '{}'::text[] end);
end $$;

-- 가입 거절 — 계정을 지운다 (같은 이메일로 다시 신청할 수 있다)
create or replace function public.reject_member(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if not public.is_app_master() then raise exception '권한이 없습니다'; end if;
  select app_role into cur from public.profiles where id = p_user;
  if cur is null or cur not in ('pending','guest') then raise exception '대기 중인 가입 요청이 아닙니다'; end if;
  delete from auth.users where id = p_user;
end $$;

-- 등급 바꾸기 — 뷰어 → 마스터는 마스터 이상, 마스터(슈퍼마스터 포함) → 뷰어는 슈퍼마스터만
create or replace function public.set_member_role(p_user uuid, p_role text, p_advs text[] default null)
returns void language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if p_user = auth.uid() then raise exception '내 등급은 바꿀 수 없습니다'; end if;
  if p_role not in ('viewer','master') then raise exception '허용되지 않는 등급입니다'; end if;
  select app_role into cur from public.profiles where id = p_user for update;
  if cur is null then raise exception '계정을 찾지 못했습니다'; end if;
  if cur in ('pending','guest') then raise exception '가입 승인부터 해 주세요'; end if;
  if cur = 'viewer' then
    if not public.is_app_master() then raise exception '권한이 없습니다'; end if;
  else
    if not public.is_super() then raise exception '마스터 등급은 슈퍼마스터만 바꿀 수 있습니다'; end if;
  end if;
  if cur <> p_role then
    update public.profiles set app_role = p_role where id = p_user;
  end if;
  if p_role = 'master' then
    delete from public.viewer_advertisers where user_id = p_user;
  elsif p_advs is not null then
    perform public._set_viewer_advs(p_user, p_advs);
  end if;
end $$;

-- 뷰어가 볼 광고주 지정 — 마스터 이상
create or replace function public.set_viewer_advertisers(p_user uuid, p_advs text[])
returns void language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if not public.is_app_master() then raise exception '권한이 없습니다'; end if;
  select app_role into cur from public.profiles where id = p_user;
  if cur is distinct from 'viewer' then raise exception '뷰어 계정에만 광고주를 지정합니다'; end if;
  perform public._set_viewer_advs(p_user, p_advs);
end $$;

-- 탈퇴 — 뷰어 · 승인 대기는 마스터 이상, 마스터 · 슈퍼마스터는 슈퍼마스터만. 나 자신은 안 됨
create or replace function public.remove_member(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if p_user = auth.uid() then raise exception '내 계정은 탈퇴시킬 수 없습니다'; end if;
  select app_role into cur from public.profiles where id = p_user;
  if cur in ('viewer','pending','guest') then
    if not public.is_app_master() then raise exception '권한이 없습니다'; end if;
  else
    if not public.is_super() then raise exception '마스터 탈퇴는 슈퍼마스터만 할 수 있습니다'; end if;
  end if;
  delete from auth.users where id = p_user;
end $$;

-- 비밀번호 재설정 (메일 없이) — 뷰어는 마스터 이상, 마스터 · 슈퍼마스터는 슈퍼마스터만
create or replace function public.set_member_password(p_user uuid, p_pw text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare cur text;
begin
  if length(coalesce(p_pw,'')) < 8 then raise exception '비밀번호는 8자 이상이어야 합니다'; end if;
  if p_user = auth.uid() then raise exception '내 비밀번호는 계정 메뉴의 비밀번호 변경에서 바꿉니다'; end if;
  select app_role into cur from public.profiles where id = p_user;
  if cur is null then raise exception '계정을 찾지 못했습니다'; end if;
  if cur in ('viewer') then
    if not public.is_app_master() then raise exception '권한이 없습니다'; end if;
  else
    if not public.is_super() then raise exception '마스터의 비밀번호는 슈퍼마스터만 바꿀 수 있습니다'; end if;
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_pw, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user;
  -- 이미 로그인해 있던 기기도 다시 로그인하게
  begin delete from auth.sessions where user_id = p_user; exception when others then null; end;
end $$;

-- 캠페인 삭제 — 마스터 이상
drop function if exists public.delete_campaign(uuid);
create or replace function public.delete_campaign(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_master() then return false; end if;
  delete from public.daily_stats      where campaign_id = p_id;
  delete from public.campaign_history where campaign_id = p_id;
  delete from public.campaigns where id = p_id;
  return true;
end $$;
alter function public.delete_campaign(uuid) set statement_timeout = '300s';

-- 예전 흐름 끄기 — 운영진 코드 · 초대로 멤버가 되던 것 (승인 없이 권한이 생기지 않게)
create or replace function public.join_by_staff_code(p_code text)
returns uuid language sql stable set search_path = public as $$ select null::uuid $$;
create or replace function public.accept_my_invites()
returns integer language sql stable set search_path = public as $$ select 0 $$;

-- ---------------------------------------------------------------------
-- 6. 실행 권한 — Supabase 는 새 함수를 anon · authenticated 에게 기본으로 열어 두므로 하나씩 정한다
-- ---------------------------------------------------------------------
revoke all on function public._set_viewer_advs(uuid,text[])            from public, anon, authenticated;
revoke all on function public.pending_count()                           from public, anon;
revoke all on function public.list_members()                            from public, anon;
revoke all on function public.approve_member(uuid,text,text[])          from public, anon;
revoke all on function public.reject_member(uuid)                       from public, anon;
revoke all on function public.set_member_role(uuid,text,text[])         from public, anon;
revoke all on function public.set_viewer_advertisers(uuid,text[])       from public, anon;
revoke all on function public.remove_member(uuid)                       from public, anon;
revoke all on function public.set_member_password(uuid,text)            from public, anon;
revoke all on function public.delete_campaign(uuid)                     from public, anon;
grant execute on function public.pending_count()                        to authenticated;
grant execute on function public.list_members()                         to authenticated;
grant execute on function public.approve_member(uuid,text,text[])       to authenticated;
grant execute on function public.reject_member(uuid)                    to authenticated;
grant execute on function public.set_member_role(uuid,text,text[])      to authenticated;
grant execute on function public.set_viewer_advertisers(uuid,text[])    to authenticated;
grant execute on function public.remove_member(uuid)                    to authenticated;
grant execute on function public.set_member_password(uuid,text)         to authenticated;
grant execute on function public.delete_campaign(uuid)                  to authenticated;
grant execute on function public.can_view_adv(text)                     to authenticated;
revoke all on function public.campaign_codes()                          from public, anon;
grant execute on function public.campaign_codes()                       to authenticated;
revoke all on function public.my_campaign_ids()                         from public, anon;
grant execute on function public.my_campaign_ids()                      to authenticated;
revoke all on function public.sync_profile_email()                      from public, anon, authenticated;
-- 예전 마스터 권한 요청 · 계정 관리 함수는 닫는다
do $$ begin
  begin revoke all on function public.request_access(text)          from public, anon, authenticated; exception when undefined_function then null; end;
  begin revoke all on function public.decide_access(uuid,boolean)   from public, anon, authenticated; exception when undefined_function then null; end;
  begin revoke all on function public.set_app_role(uuid,text)       from public, anon, authenticated; exception when undefined_function then null; end;
  begin revoke all on function public.list_accounts()               from public, anon, authenticated; exception when undefined_function then null; end;
end $$;

-- ---------------------------------------------------------------------
-- 7. 기존 계정 옮기기
--    · 슈퍼마스터 · 마스터는 그대로
--    · 예전 캠페인 멤버(운영진 · 광고주)였던 미승인 계정 → 뷰어 + 그 캠페인들의 광고주
--    · 그 밖의 미승인(guest) 계정 → 승인 대기 (회원 관리에서 승인하거나 거절)
-- ---------------------------------------------------------------------
insert into public.viewer_advertisers(user_id, adv_key, adv)
select m.user_id, public.adv_key(c.advertiser), min(btrim(c.advertiser))
  from public.campaign_members m
  join public.campaigns c on c.id = m.campaign_id
  join public.profiles p on p.id = m.user_id and p.app_role = 'guest'
 where public.adv_key(c.advertiser) is not null
 group by m.user_id, public.adv_key(c.advertiser)
on conflict do nothing;
update public.profiles p set app_role = 'viewer', approved_at = coalesce(p.approved_at, now())
 where p.app_role = 'guest'
   and exists(select 1 from public.viewer_advertisers v where v.user_id = p.id);
update public.profiles
   set app_role = 'pending',
       note = case when coalesce(note,'') = '' then '이전 구글 로그인 계정' else note end
 where app_role = 'guest';

-- ---------------------------------------------------------------------
-- 8. 슈퍼마스터 지정 — ⚠ 이메일로 한꺼번에 지정하지 않는다.
--    "Confirm email" 을 끈 뒤에는 누구나 아무 이메일로 가입할 수 있어, 같은 주소를 먼저 가입한 사람이 슈퍼가 될 수 있다.
--    ① "Confirm email" 을 켠 채로 Authentication → Users → Add user 로 계정을 만들고(Auto Confirm)
--    ② 그 계정의 id(UUID)를 확인해 아래처럼 id 로 지정한다 (정확히 한 줄이 바뀌어야 한다)
--      update public.profiles p set app_role = 'super', approved_at = coalesce(p.approved_at, now())
--        from auth.users u
--       where p.id = u.id and u.id = '<계정 UUID>' and lower(u.email) = '<이메일>';
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
