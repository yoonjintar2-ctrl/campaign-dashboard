-- =====================================================================
--  디지털 캠페인 통합 대시보드 — Supabase 스키마
--  Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 [Run]
--  여러 번 실행해도 안전합니다 (모두 if not exists / or replace).
--
--  저장 방식(하이브리드)
--   · campaigns.doc  : 캠페인 설정 · 라인(예상효율) · 소재 · 이슈 · 화면 구성 = JSON 한 덩어리
--   · daily_stats    : 일별 실적만 정규화 (campaign_id · 일자 · 라인 · 지표)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. 테이블
-- ---------------------------------------------------------------------

-- 사용자 프로필 (구글 로그인 시 자동 생성)
create table if not exists public.profiles(
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  org         text,                        -- 소속 (미디어웍스 / BMW Korea 등)
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- 캠페인
create table if not exists public.campaigns(
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  advertiser  text not null default '',
  start_date  date,
  end_date    date,
  doc         jsonb not null default '{}'::jsonb,
  created_by  uuid references auth.users(id),
  updated_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 캠페인 멤버 = 권한. master(마스터) / editor(편집) / viewer(조회)
create table if not exists public.campaign_members(
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'viewer' check (role in ('master','editor','viewer')),
  invited_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

-- 아직 가입하지 않은 사람 초대 (가입/로그인 시 자동으로 멤버가 된다)
create table if not exists public.campaign_invites(
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  email       text not null,
  role        text not null default 'viewer' check (role in ('master','editor','viewer')),
  invited_by  uuid references auth.users(id),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (campaign_id, email)
);

-- 일별 실적 — line_key = 구분|매체|광고상품|타겟팅그룹|제품
create table if not exists public.daily_stats(
  id          bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  stat_date   date not null,
  line_key    text not null,
  creative    text not null default '',
  imp         bigint  not null default 0,
  click       bigint  not null default 0,
  view        bigint  not null default 0,
  eng         bigint  not null default 0,
  conv        bigint  not null default 0,
  lead        bigint  not null default 0,
  install     bigint  not null default 0,
  rev         numeric not null default 0,
  net         numeric not null default 0,   -- Net 광고비 (Gross 는 수수료율로 역산)
  extra       jsonb   not null default '{}'::jsonb,  -- 25%~100% 조회, 3/15/30초, 공감·공유, 사용자 추가 열
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now(),
  unique (campaign_id, stat_date, line_key, creative)
);
create index if not exists daily_stats_campaign_date_idx on public.daily_stats(campaign_id, stat_date);
create index if not exists daily_stats_campaign_line_idx on public.daily_stats(campaign_id, line_key);

-- 저장 시점 스냅샷 (되돌리기 · 감사 로그)
create table if not exists public.campaign_history(
  id          bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  kind        text not null default 'setup',   -- setup | input
  doc         jsonb,
  note        text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index if not exists campaign_history_idx on public.campaign_history(campaign_id, created_at desc);
-- 이력은 최근 7일만 (2026-10-07) — 한 벌이 쌓일 때마다 7일 지난 것을 지운다.
-- 클라이언트에는 삭제 권한(RLS)이 없어 security definer 로 지운다
create or replace function public.prune_campaign_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.campaign_history where created_at < now() - interval '7 days';
  return null;
end $$;
drop trigger if exists campaign_history_prune on public.campaign_history;
create trigger campaign_history_prune after insert on public.campaign_history
  for each statement execute function public.prune_campaign_history();

-- ---------------------------------------------------------------------
-- 2. 권한 판정 함수 (RLS 안에서 재귀가 생기지 않도록 security definer)
-- ---------------------------------------------------------------------
create or replace function public.is_member(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.campaign_members
                where campaign_id = c and user_id = auth.uid());
$$;

create or replace function public.can_edit(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.campaign_members
                where campaign_id = c and user_id = auth.uid() and role in ('master','editor'));
$$;

create or replace function public.is_master(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.campaign_members
                where campaign_id = c and user_id = auth.uid() and role = 'master');
$$;

-- 나와 같은 캠페인에 속한 사람인가 (프로필 열람 범위)
create or replace function public.shares_campaign(u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1
                from public.campaign_members a
                join public.campaign_members b on a.campaign_id = b.campaign_id
                where a.user_id = auth.uid() and b.user_id = u);
$$;

-- ---------------------------------------------------------------------
-- 3. 트리거
-- ---------------------------------------------------------------------

-- (1) 신규 가입 → 프로필 생성 + 나를 향한 초대 자동 수락
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name',
                   new.raw_user_meta_data->>'name', new.email),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.campaign_members(campaign_id, user_id, role, invited_by)
  select i.campaign_id, new.id, i.role, i.invited_by
  from public.campaign_invites i
  where lower(i.email) = lower(new.email) and i.accepted_at is null
  on conflict (campaign_id, user_id) do nothing;

  update public.campaign_invites set accepted_at = now()
  where lower(email) = lower(new.email) and accepted_at is null;

  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- (2) 이미 가입한 사람을 나중에 초대한 경우 — 로그인할 때 앱이 호출한다
create or replace function public.accept_my_invites()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; mail text;
begin
  select email into mail from auth.users where id = auth.uid();
  if mail is null then return 0; end if;

  insert into public.campaign_members(campaign_id, user_id, role, invited_by)
  select i.campaign_id, auth.uid(), i.role, i.invited_by
  from public.campaign_invites i
  where lower(i.email) = lower(mail) and i.accepted_at is null
  on conflict (campaign_id, user_id) do nothing;
  get diagnostics n = row_count;

  update public.campaign_invites set accepted_at = now()
  where lower(email) = lower(mail) and accepted_at is null;

  return n;
end;
$$;
grant execute on function public.accept_my_invites() to authenticated;

-- (3) 캠페인을 만든 사람은 자동으로 마스터
create or replace function public.campaign_add_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.campaign_members(campaign_id, user_id, role, invited_by)
  values (new.id, coalesce(new.created_by, auth.uid()),
          'master', coalesce(new.created_by, auth.uid()))
  on conflict (campaign_id, user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists campaigns_add_owner on public.campaigns;
create trigger campaigns_add_owner
  after insert on public.campaigns
  for each row execute function public.campaign_add_owner();

-- (4) daily_stats 갱신 정보 자동 기록
create or replace function public.touch_daily_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists daily_stats_touch on public.daily_stats;
create trigger daily_stats_touch
  before insert or update on public.daily_stats
  for each row execute function public.touch_daily_stats();

-- ---------------------------------------------------------------------
-- 4. RLS — 초대받은 캠페인의 데이터만 보인다
-- ---------------------------------------------------------------------
-- v57: 계정에 붙는 사용자 설정 (내가 만든 열 등). 어느 캠페인·어느 기기에서도 그대로 따라온다.
alter table public.profiles
  add column if not exists prefs jsonb not null default '{}'::jsonb;

alter table public.profiles          enable row level security;
alter table public.campaigns         enable row level security;
alter table public.campaign_members  enable row level security;
alter table public.campaign_invites  enable row level security;
alter table public.daily_stats       enable row level security;
alter table public.campaign_history  enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_campaign(id));
drop policy if exists profiles_upsert on public.profiles;
create policy profiles_upsert on public.profiles for insert to authenticated
  with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- campaigns
drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns for select to authenticated
  using (public.is_member(id) or created_by = auth.uid());
drop policy if exists campaigns_insert on public.campaigns;
create policy campaigns_insert on public.campaigns for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns for update to authenticated
  using (public.can_edit(id)) with check (public.can_edit(id));
drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns for delete to authenticated
  using (public.is_master(id));

-- campaign_members
drop policy if exists members_select on public.campaign_members;
create policy members_select on public.campaign_members for select to authenticated
  using (user_id = auth.uid() or public.is_member(campaign_id));
drop policy if exists members_write on public.campaign_members;
create policy members_write on public.campaign_members for all to authenticated
  using (public.is_master(campaign_id)) with check (public.is_master(campaign_id));

-- campaign_invites
drop policy if exists invites_select on public.campaign_invites;
create policy invites_select on public.campaign_invites for select to authenticated
  using (public.is_member(campaign_id));
drop policy if exists invites_write on public.campaign_invites;
create policy invites_write on public.campaign_invites for all to authenticated
  using (public.is_master(campaign_id)) with check (public.is_master(campaign_id));

-- daily_stats
drop policy if exists stats_select on public.daily_stats;
create policy stats_select on public.daily_stats for select to authenticated
  using (public.is_member(campaign_id));
drop policy if exists stats_write on public.daily_stats;
create policy stats_write on public.daily_stats for all to authenticated
  using (public.can_edit(campaign_id)) with check (public.can_edit(campaign_id));

-- campaign_history
drop policy if exists history_select on public.campaign_history;
create policy history_select on public.campaign_history for select to authenticated
  using (public.is_member(campaign_id));
drop policy if exists history_insert on public.campaign_history;
create policy history_insert on public.campaign_history for insert to authenticated
  with check (public.can_edit(campaign_id));

-- ---------------------------------------------------------------------
-- 5. 리포트용 뷰 (선택) — 일자 × 매체 집계
-- ---------------------------------------------------------------------
create or replace view public.v_daily_by_media as
select campaign_id,
       stat_date,
       split_part(line_key, '|', 2) as media,
       sum(imp) as imp, sum(click) as click, sum(view) as view,
       sum(conv) as conv, sum(net) as net
from public.daily_stats
group by campaign_id, stat_date, split_part(line_key, '|', 2);

-- ---------------------------------------------------------------------
-- 6. 공유 코드 — 로그인 없이 "조회 전용"으로 캠페인을 여는 8자리 코드
--    시행사가 광고주에게 코드(또는 ?code=XXXX-XXXX 링크)를 전달한다.
--    코드는 캠페인마다 자동으로 붙고, 캠페인 관리에서 재발급할 수 있다.
-- ---------------------------------------------------------------------

-- 헷갈리는 글자(I O 0 1 S 5 B 8 2 Z)를 뺀 알파벳으로 8자리 코드를 만든다
create or replace function public.gen_share_code()
returns text language plpgsql as $$
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
    exit when not exists (select 1 from public.campaigns c where c.share_code = out);
  end loop;
  return out;
end $$;

alter table public.campaigns
  add column if not exists share_code text;
update public.campaigns set share_code = public.gen_share_code() where share_code is null;
alter table public.campaigns
  alter column share_code set default public.gen_share_code(),
  alter column share_code set not null;
create unique index if not exists campaigns_share_code_key on public.campaigns(share_code);

-- 코드로 캠페인 문서를 읽는다 (SECURITY DEFINER — RLS 를 우회하지만 읽기 전용)
-- (7장에서 돌려주는 열이 늘어나므로 먼저 지우고 다시 만든다)
drop function if exists public.open_by_code(text);
create or replace function public.open_by_code(p_code text)
returns table(id uuid, name text, advertiser text, doc jsonb)
language sql security definer set search_path = public as $$
  select c.id, c.name, c.advertiser, c.doc
  from public.campaigns c
  where upper(c.share_code) = upper(trim(p_code))
  limit 1;
$$;

-- 코드로 일별 실적을 읽는다
create or replace function public.stats_by_code(p_code text)
returns table(stat_date date, line_key text, imp bigint, click bigint, view bigint,
              eng bigint, conv bigint, lead bigint, install bigint, rev bigint,
              net bigint, extra jsonb)
language sql security definer set search_path = public as $$
  select d.stat_date, d.line_key, d.imp, d.click, d.view, d.eng, d.conv,
         d.lead, d.install, d.rev, d.net, d.extra
  from public.daily_stats d
  join public.campaigns c on c.id = d.campaign_id
  where upper(c.share_code) = upper(trim(p_code));
$$;

-- 로그인하지 않은 방문자(anon)도 이 두 함수만 부를 수 있다 (표 직접 접근은 여전히 RLS 로 차단)
grant execute on function public.open_by_code(text)  to anon, authenticated;
grant execute on function public.stats_by_code(text) to anon, authenticated;
revoke execute on function public.gen_share_code() from anon;

-- =====================================================================
-- 7. 접속 권한 4단계 (v24)
--    ① 슈퍼마스터 — 계정 하나. 마스터 권한 부여/박탈, 모든 캠페인 열람·삭제,
--                   캠페인 운영진 임명/해제
--    ② 마스터     — 슈퍼마스터가 승인한 계정. 캠페인 생성·수정·삭제.
--                   단, 본인이 만든 캠페인만 보이고 마스터 권한은 줄 수 없다
--    ③ 운영진     — 캠페인의 "운영진 코드"로 들어왔거나 마스터가 초대한 사람.
--                   그 캠페인 안에서는 마스터와 동등 (모든 데이터 수정·추가)
--    ④ 광고주     — 캠페인의 "뷰어 코드"로 들어온 사람. 대시보드 탭 열람 + 엑셀 다운로드만
-- =====================================================================

-- ---- ① 계정 등급 -----------------------------------------------------
alter table public.profiles
  add column if not exists app_role text not null default 'guest';
do $$ begin
  alter table public.profiles
    add constraint profiles_app_role_chk check (app_role in ('super','master','guest'));
exception when duplicate_object then null; end $$;

-- 슈퍼마스터 지정: 아래 이메일을 본인 구글 계정으로 바꾼 뒤 한 번 실행하세요.
--   update public.profiles set app_role='super' where email='yoonjintar2@gmail.com';

create or replace function public.is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p
                where p.id = auth.uid() and p.app_role = 'super');
$$;
-- 계정 등급이 마스터 이상인가 (캠페인 단위 is_master(uuid) 와 구분해서 is_app_master)
create or replace function public.is_app_master()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p
                where p.id = auth.uid() and p.app_role in ('super','master'));
$$;
create or replace function public.my_app_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select p.app_role from public.profiles p where p.id = auth.uid()),'guest');
$$;

-- ---- ② 캠페인별 코드 2종 --------------------------------------------
--   share_code = 뷰어(광고주) 코드   ·   staff_code = 운영진 코드
alter table public.campaigns
  add column if not exists staff_code text;
update public.campaigns set staff_code = public.gen_share_code() where staff_code is null;
alter table public.campaigns
  alter column staff_code set default public.gen_share_code(),
  alter column staff_code set not null;
create unique index if not exists campaigns_staff_code_key on public.campaigns(staff_code);

-- 코드로 캠페인을 연다 — 어느 코드로 들어왔는지(code_kind)도 함께 돌려준다
drop function if exists public.open_by_code(text);
create or replace function public.open_by_code(p_code text)
returns table(id uuid, name text, advertiser text, doc jsonb, code_kind text)
language sql security definer set search_path = public as $$
  select c.id, c.name, c.advertiser, c.doc,
         case when upper(c.staff_code) = upper(trim(p_code)) then 'staff' else 'viewer' end
  from public.campaigns c
  where upper(c.share_code) = upper(trim(p_code))
     or upper(c.staff_code) = upper(trim(p_code))
  limit 1;
$$;

-- 운영진 코드로 들어온 사람이 로그인하면 그 캠페인의 운영진으로 등록된다
create or replace function public.join_by_staff_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then return null; end if;
  select c.id into cid from public.campaigns c
   where upper(c.staff_code) = upper(trim(p_code)) limit 1;
  if cid is null then return null; end if;
  insert into public.campaign_members(campaign_id, user_id, role)
  values (cid, auth.uid(), 'editor')
  on conflict (campaign_id, user_id) do nothing;
  return cid;
end $$;

-- ---- ③ 마스터 권한 요청 ---------------------------------------------
create table if not exists public.access_requests(
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text,
  name       text,
  org        text,
  message    text not null default '',
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.access_requests enable row level security;

drop policy if exists areq_insert on public.access_requests;
create policy areq_insert on public.access_requests for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists areq_select on public.access_requests;
create policy areq_select on public.access_requests for select to authenticated
  using (user_id = auth.uid() or public.is_super());
drop policy if exists areq_update on public.access_requests;
create policy areq_update on public.access_requests for update to authenticated
  using (public.is_super()) with check (public.is_super());

-- 요청 보내기 (같은 사람이 여러 번 보내면 마지막 것만 대기 상태로 남는다)
create or replace function public.request_access(p_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  delete from public.access_requests
   where user_id = auth.uid() and status = 'pending';
  insert into public.access_requests(user_id, email, name, org, message)
  select auth.uid(), p.email, p.name, p.org, coalesce(p_message,'')
    from public.profiles p where p.id = auth.uid();
end $$;

-- 슈퍼마스터가 승인/거절 (승인하면 그 계정이 마스터가 된다)
create or replace function public.decide_access(p_request uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_super() then raise exception '권한이 없습니다'; end if;
  select user_id into uid from public.access_requests where id = p_request;
  if uid is null then return; end if;
  update public.access_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(), decided_at = now()
   where id = p_request;
  if p_approve then
    update public.profiles set app_role = 'master' where id = uid and app_role <> 'super';
  end if;
end $$;

-- 슈퍼마스터가 계정 등급을 직접 바꾼다 (마스터 부여 · 박탈)
create or replace function public.set_app_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super() then raise exception '권한이 없습니다'; end if;
  if p_role not in ('master','guest') then raise exception '허용되지 않는 등급입니다'; end if;
  update public.profiles set app_role = p_role where id = p_user and app_role <> 'super';
end $$;

-- 슈퍼마스터 화면용 목록
create or replace function public.list_accounts()
returns table(id uuid, email text, name text, org text, app_role text,
              campaigns bigint, created_at timestamptz)
language sql security definer set search_path = public as $$
  select p.id, p.email, p.name, p.org, p.app_role,
         (select count(*) from public.campaigns c where c.created_by = p.id),
         p.created_at
  from public.profiles p
  where public.is_super()
  order by (p.app_role='super') desc, (p.app_role='master') desc, p.created_at desc;
$$;

grant execute on function public.is_super()               to authenticated;
grant execute on function public.is_app_master()          to authenticated;
grant execute on function public.my_app_role()            to authenticated;
grant execute on function public.join_by_staff_code(text) to authenticated;
grant execute on function public.request_access(text)     to authenticated;
grant execute on function public.decide_access(uuid,boolean) to authenticated;
grant execute on function public.set_app_role(uuid,text)  to authenticated;
grant execute on function public.list_accounts()          to authenticated;

-- ---- ④ 캠페인 접근 규칙 다시 세우기 ---------------------------------
--   · 슈퍼마스터 : 전부
--   · 마스터     : 본인이 만든 캠페인 + 본인이 멤버인 캠페인
--   · 운영진     : 멤버인 캠페인 (수정 가능)
--   · 광고주     : 코드로만 열람 (표에 직접 접근하지 않고 open_by_code 로)
-- 앞 절(4장)에서 만든 규칙을 지우고 4단계 권한 기준으로 다시 만든다.
-- (이름이 다르면 두 규칙이 OR 로 함께 걸려 제한이 풀리므로 반드시 같은 이름을 쓴다)
drop policy if exists camp_select on public.campaigns;
drop policy if exists camp_insert on public.campaigns;
drop policy if exists camp_update on public.campaigns;
drop policy if exists camp_delete on public.campaigns;
drop policy if exists prof_select on public.profiles;

drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns for select to authenticated
  using (public.is_super() or created_by = auth.uid() or public.is_member(id));

drop policy if exists campaigns_insert on public.campaigns;
create policy campaigns_insert on public.campaigns for insert to authenticated
  with check (public.is_app_master() and created_by = auth.uid());

drop policy if exists campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns for update to authenticated
  using (public.is_super() or created_by = auth.uid() or public.can_edit(id))
  with check (public.is_super() or created_by = auth.uid() or public.can_edit(id));

drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns for delete to authenticated
  using (public.is_super() or created_by = auth.uid());

-- 프로필: 본인 것 + 슈퍼마스터는 전부 + 같은 캠페인 멤버끼리
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_super()
         or exists(select 1 from public.campaign_members m1
                    join public.campaign_members m2 on m1.campaign_id = m2.campaign_id
                   where m1.user_id = auth.uid() and m2.user_id = public.profiles.id));

-- ---------------------------------------------------------------------
-- 캠페인 삭제 (v45)
--   RLS 정책이 예전 버전으로 남아 있는 프로젝트에서도 확실히 지워지도록
--   서버 함수로 한 번 더 길을 열어 둔다.
--   지울 수 있는 사람 — 슈퍼마스터 · 그 캠페인을 만든 사람 · 그 캠페인의 마스터
-- ---------------------------------------------------------------------
drop function if exists public.delete_campaign(uuid);
create or replace function public.delete_campaign(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select (public.is_super()
          or exists(select 1 from public.campaigns c
                     where c.id = p_id and c.created_by = auth.uid())
          or public.is_master(p_id))
    into ok;
  if not ok then return false; end if;
  -- 일별 실적이 아주 많은 캠페인은 cascade 한 번으로 지우면 시간 제한에 걸린다.
  -- 자식부터 먼저 지우고 마지막에 캠페인 행을 지운다. (v48)
  delete from public.daily_stats      where campaign_id = p_id;
  delete from public.campaign_history where campaign_id = p_id;
  delete from public.campaigns where id = p_id;   -- 남은 자식 테이블은 on delete cascade
  return true;
end;
$$;
-- 이 함수 안에서만 시간 제한을 넉넉히 준다 (기본값은 몇 초라 큰 캠페인에서 취소된다)
alter function public.delete_campaign(uuid) set statement_timeout = '300s';
grant execute on function public.delete_campaign(uuid) to authenticated;

-- =====================================================================
--  v66 — 트렌드 리포트 게시판
--  모든 캠페인이 함께 쓰는 자료 게시판입니다. 이 블록만 따로 실행해도 됩니다.
--
--  실행 전에 Storage 에서 버킷을 하나 만들어 주세요.
--    Supabase 대시보드 > Storage > New bucket
--      이름: trend      /  Public bucket: 켬
--      File size limit: 10 MB  (게시판이 10MB 로 막지만 서버에서도 한 번 더 막습니다)
-- =====================================================================

create table if not exists public.trend_posts(
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  category    text not null default '기타',
  medium      text not null default '',          -- 세부 매체명 (선택)
  tags        jsonb not null default '[]'::jsonb,-- 해시태그 최대 5개
  secret      boolean not null default false,    -- 대외비 표시
  files       jsonb not null default '[]'::jsonb,-- [{name,size,kind,path}]
  link        text not null default '',
  thumb       text not null default '',          -- 카드 썸네일 (data URL)
  bytes       bigint not null default 0,         -- 이 글이 쓰는 용량
  author_id   uuid references auth.users(id) on delete set null,
  author_name text not null default '',
  guest_id    text not null default '',          -- 비로그인 표시 이름
  guest_hash  text,                              -- 비로그인 수정·삭제용 (원문 아님)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists trend_posts_created_idx on public.trend_posts(created_at desc);
create index if not exists trend_posts_cat_idx     on public.trend_posts(category);

-- 카테고리 목록·순서, 매체명 사전
create table if not exists public.trend_meta(
  k          text primary key,
  v          jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 목록용 뷰 — guest_hash 는 절대 내려보내지 않는다 (있는지 여부만)
-- ---------------------------------------------------------------------
create or replace view public.trend_posts_pub
with (security_invoker = off) as
select id,title,body,category,medium,tags,secret,files,link,thumb,bytes,
       author_id,author_name,guest_id,
       (guest_hash is not null and guest_hash <> '') as has_pw,
       created_at,updated_at
from public.trend_posts;

-- ---------------------------------------------------------------------
-- 이 게시판을 관리할 수 있는 사람인가 — 마스터 · 슈퍼마스터 · 운영진
-- ---------------------------------------------------------------------
create or replace function public.trend_is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((
    select true from public.profiles p
     where p.id = auth.uid()
       and coalesce(p.org,'') <> ''      -- 가입한 사람
       and exists (select 1 from public.campaign_members m
                    where m.user_id = p.id and m.role in ('master','editor'))
  ), false);
$$;

-- ---------------------------------------------------------------------
-- 수정·삭제 — 관리자이거나, 글쓴이이거나, 비밀번호 흔적이 맞을 때만
-- ---------------------------------------------------------------------
create or replace function public.trend_check(p_id uuid, p_hash text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.trend_posts t
                 where t.id = p_id and t.guest_hash is not null
                   and t.guest_hash = p_hash);
$$;

create or replace function public.trend_edit(p_row jsonb, p_hash text)
returns void language plpgsql security definer set search_path=public as $$
declare v_id uuid := (p_row->>'id')::uuid; v_ok boolean := false;
begin
  select (public.trend_is_admin())
      or (t.author_id is not null and t.author_id = auth.uid())
      or (t.guest_hash is not null and t.guest_hash = p_hash)
    into v_ok
    from public.trend_posts t where t.id = v_id;
  if not coalesce(v_ok,false) then
    raise exception '수정 권한이 없습니다';
  end if;
  update public.trend_posts set
    title=coalesce(p_row->>'title',title),
    body=coalesce(p_row->>'body',body),
    category=coalesce(p_row->>'category',category),
    medium=coalesce(p_row->>'medium',medium),
    tags=coalesce(p_row->'tags',tags),
    secret=coalesce((p_row->>'secret')::boolean,secret),
    files=coalesce(p_row->'files',files),
    link=coalesce(p_row->>'link',link),
    thumb=coalesce(p_row->>'thumb',thumb),
    bytes=coalesce((p_row->>'bytes')::bigint,bytes),
    updated_at=now()
  where id=v_id;
end; $$;

create or replace function public.trend_remove(p_id uuid, p_hash text)
returns void language plpgsql security definer set search_path=public as $$
declare v_ok boolean := false;
begin
  select (public.trend_is_admin())
      or (t.author_id is not null and t.author_id = auth.uid())
      or (t.guest_hash is not null and t.guest_hash = p_hash)
    into v_ok
    from public.trend_posts t where t.id = p_id;
  if not coalesce(v_ok,false) then
    raise exception '삭제 권한이 없습니다';
  end if;
  delete from public.trend_posts where id = p_id;
end; $$;

-- 카테고리를 없앴을 때 그 글들을 기타로 옮긴다 (관리자만)
create or replace function public.trend_recat(p_ids uuid[], p_cat text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.trend_is_admin() then raise exception '권한이 없습니다'; end if;
  update public.trend_posts set category=p_cat, updated_at=now() where id = any(p_ids);
end; $$;

-- ---------------------------------------------------------------------
-- 권한 (RLS)
--   · 목록은 뷰로만 본다 (표 자체는 직접 못 읽는다 = guest_hash 가 새지 않는다)
--   · 올리기는 누구나 (로그인하지 않아도 됨)
--   · 고치기 · 지우기는 위의 함수로만
-- ---------------------------------------------------------------------
alter table public.trend_posts enable row level security;
alter table public.trend_meta  enable row level security;

drop policy if exists trend_posts_insert on public.trend_posts;
create policy trend_posts_insert on public.trend_posts
  for insert to anon, authenticated with check (true);

drop policy if exists trend_meta_read on public.trend_meta;
create policy trend_meta_read on public.trend_meta
  for select to anon, authenticated using (true);
drop policy if exists trend_meta_write on public.trend_meta;
create policy trend_meta_write on public.trend_meta
  for all to anon, authenticated using (true) with check (true);

grant select on public.trend_posts_pub to anon, authenticated;
grant insert on public.trend_posts     to anon, authenticated;
grant select, insert, update on public.trend_meta to anon, authenticated;
grant execute on function public.trend_check(uuid,text)  to anon, authenticated;
grant execute on function public.trend_edit(jsonb,text)   to anon, authenticated;
grant execute on function public.trend_remove(uuid,text)  to anon, authenticated;
grant execute on function public.trend_recat(uuid[],text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage — 버킷 trend (위에서 손으로 만든 뒤 아래 권한을 겁니다)
-- ---------------------------------------------------------------------
drop policy if exists trend_files_read   on storage.objects;
create policy trend_files_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'trend');
drop policy if exists trend_files_write  on storage.objects;
create policy trend_files_write on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'trend');
drop policy if exists trend_files_delete on storage.objects;
create policy trend_files_delete on storage.objects
  for delete to anon, authenticated using (bucket_id = 'trend');

-- =====================================================================
-- v78 (2026-09-30) 트렌드 리포트 게시판 보안 보강 — 위 트렌드 권한을 덮어쓴다
-- (이미 만든 DB 는 supabase/2026-09-30_trend_security.sql 만 실행하면 된다)
--   대외비 글은 관리 계정 · 글쓴이에게만 · 대외비 파일은 목록 조회 불가 ·
--   글에 붙은 파일은 저장소에서 바로 못 지움 · 카테고리는 관리 계정만
-- =====================================================================
-- 파일이 어느 글에 붙어 있는지 — 저장소 권한 안에서 쓰는 도우미.
-- (글 표는 직접 읽을 수 없게 막혀 있으므로 SECURITY DEFINER 로 판정만 돌려준다)
create or replace function public.trend_file_state(p_name text)
returns text language sql stable security definer set search_path=public as $$
  select case
    when exists(select 1 from public.trend_posts t, jsonb_array_elements(t.files) f
                 where t.secret and f->>'path' = p_name) then 'secret'
    when exists(select 1 from public.trend_posts t, jsonb_array_elements(t.files) f
                 where f->>'path' = p_name) then 'live'
    else 'orphan' end;
$$;
grant execute on function public.trend_file_state(text) to anon, authenticated;

-- ① 목록 뷰 — 대외비 글은 관리 계정 · 글쓴이에게만
create or replace view public.trend_posts_pub
with (security_invoker = off) as
select id,title,body,category,medium,tags,secret,files,link,thumb,bytes,
       author_id,author_name,guest_id,
       (guest_hash is not null and guest_hash <> '') as has_pw,
       created_at,updated_at
from public.trend_posts
where not secret
   or public.trend_is_admin()
   or (author_id is not null and author_id = auth.uid());
grant select on public.trend_posts_pub to anon, authenticated;

-- ② 저장소 읽기(목록) — 대외비 글의 파일은 관리 계정만
drop policy if exists trend_files_read on storage.objects;
create policy trend_files_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'trend'
         and (public.trend_file_state(name) <> 'secret' or public.trend_is_admin()));

-- ③ 저장소 지우기 — 글에 붙어 있지 않은 파일만 (관리 계정은 전부)
drop policy if exists trend_files_delete on storage.objects;
create policy trend_files_delete on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'trend'
         and (public.trend_file_state(name) = 'orphan' or public.trend_is_admin()));

-- ④ 게시판 설정
drop policy if exists trend_meta_write on public.trend_meta;
drop policy if exists trend_meta_ins   on public.trend_meta;
drop policy if exists trend_meta_upd   on public.trend_meta;
create policy trend_meta_ins on public.trend_meta
  for insert to anon, authenticated
  with check (k = 'media' or public.trend_is_admin());
create policy trend_meta_upd on public.trend_meta
  for update to anon, authenticated
  using (k = 'media' or public.trend_is_admin())
  with check (k = 'media' or public.trend_is_admin());

-- =====================================================================
-- v81 (2026-10-01) 전체 캠페인 메뉴 — 같은 광고주의 모든 캠페인 요약
-- Supabase → SQL Editor 에 이 파일 내용을 붙여 넣고 한 번 실행하세요. (여러 번 실행해도 됩니다)
--
--   광고주(뷰어 코드)로 들어온 화면은 다른 캠페인 표를 직접 읽을 수 없다(RLS).
--   이 함수가 같은 광고주의 캠페인 요약만 골라 돌려준다.
--   · 뷰어 코드 — 그 캠페인에서 '전체 캠페인' 메뉴를 켜고 "광고주에게 보이기" 를 켠 경우에만
--   · 운영진 코드 · 그 캠페인의 멤버(시행사 로그인) — 메뉴를 켜 두기만 하면
--   · 같은 광고주 = 광고주 이름이 같은 캠페인(대소문자 · 앞뒤 공백 무시). 광고주가 비어 있으면 자기 캠페인만
--   · 문서 전체가 아니라 요약에 필요한 조각만 — 이미지 · 코멘트 · 입력 시트 · 코드는 돌려주지 않는다
--   실행하지 않아도 시행사 화면(로그인)에서는 내가 볼 수 있는 캠페인으로 그대로 동작한다.
-- =====================================================================
-- (아래 v82 에서 돌려주는 열이 늘어나므로, 다시 실행할 때를 위해 먼저 지운다)
drop function if exists public.overview_by_code(text);
create or replace function public.overview_by_code(p_code text)
returns table(id uuid, name text, start_date date, end_date date, updated_at timestamptz, is_self boolean,
              media jsonb, lines jsonb, tv jsonb, ooh jsonb,
              net numeric, imp numeric, click numeric, view numeric)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  src public.campaigns%rowtype;
  k text := upper(trim(coalesce(p_code,'')));
  staff boolean;
  m jsonb;
begin
  if k = '' then return; end if;
  select * into src from public.campaigns c
   where upper(c.share_code) = k or upper(c.staff_code) = k limit 1;
  if not found then return; end if;
  staff := upper(coalesce(src.staff_code,'')) = k;
  m := src.doc->'campaign'->'menus'->'overview';
  -- 메뉴를 끈 캠페인이면 아무것도 돌려주지 않는다
  if coalesce(m->>'on','') = 'false' then return; end if;
  -- 뷰어 코드는 "광고주에게 보이기" 를 켠 경우에만 (멤버로 로그인한 시행사는 미리 볼 수 있다)
  if not staff and coalesce(m->>'viewer','') <> 'true'
     and not (auth.uid() is not null and (public.is_member(src.id) or public.is_super())) then
    return;
  end if;
  return query
  select c.id, c.name, c.start_date, c.end_date, c.updated_at, c.id = src.id,
         c.doc->'campaign'->'media',
         coalesce((select jsonb_agg(jsonb_build_object('gross',l->'gross','net',l->'net','start',l->'start','end',l->'end'))
                     from jsonb_array_elements(case when jsonb_typeof(c.doc->'lines')='array'
                                                    then c.doc->'lines' else '[]'::jsonb end) l),'[]'::jsonb),
         jsonb_build_object('plan',c.doc->'tv'->'plan','spots',c.doc->'tv'->'spots'),
         c.doc->'ooh'->'plan',
         s.net, s.imp, s.click, s.view
    from public.campaigns c
    left join lateral (select sum(d.net)::numeric as net, sum(d.imp)::numeric as imp,
                              sum(d.click)::numeric as click, sum(d.view)::numeric as view
                         from public.daily_stats d where d.campaign_id = c.id) s on true
   where (coalesce(trim(src.advertiser),'') <> ''
          and lower(trim(c.advertiser)) = lower(trim(src.advertiser)))
      or c.id = src.id
   order by c.start_date nulls last, c.name;
end $$;
revoke all on function public.overview_by_code(text) from public;
grant execute on function public.overview_by_code(text) to anon, authenticated;

-- =====================================================================
-- v82 (2026-10-01) 접근 권한을 광고주 단위로
-- Supabase → SQL Editor 에 이 파일 내용을 붙여 넣고 한 번 실행하세요. (여러 번 실행해도 됩니다)
--
--   예전: 코드 · 초대(멤버) 권한이 캠페인 하나에만 걸렸다.
--   이제: 같은 광고주(광고주 이름이 같은 캠페인 — 대소문자 · 앞뒤 공백 무시)의 캠페인 전체에 걸린다.
--   · 멤버(시행사 로그인) — 한 캠페인의 멤버면 같은 광고주의 모든 캠페인을 본다.
--                           운영진 · 마스터로 초대받은 캠페인이 하나라도 있으면 그 광고주의 모든 캠페인을 수정할 수 있다.
--   · 캠페인 관리(멤버 초대 · 이름 변경 · 삭제)는 지금처럼 그 캠페인의 마스터 · 만든 사람만
--   · 뷰어 코드 · 운영진 코드 — 같은 광고주의 다른 캠페인으로 옮겨 갈 수 있다 (adv_campaigns_by_code)
--   · 광고주 이름이 비어 있는 캠페인은 묶지 않는다(그 캠페인만)
--   전체 캠페인 메뉴의 함수(overview_by_code)도 캠페인 이동에 쓰는 코드를 함께 돌려주도록 바꾼다.
-- =====================================================================

-- 광고주 열쇠 — 이름 정리. 빈 이름은 null (묶지 않음)
create or replace function public.adv_key(a text)
returns text language sql immutable set search_path = public as $$
  select nullif(lower(regexp_replace(btrim(coalesce(a,'')), '\s+', ' ', 'g')), '');
$$;

-- 멤버인가 — 그 캠페인 또는 같은 광고주의 다른 캠페인의 멤버
create or replace function public.is_member(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.campaign_members m
     where m.user_id = auth.uid()
       and (m.campaign_id = c
            or exists(select 1
                        from public.campaigns t
                        join public.campaigns mc on mc.id = m.campaign_id
                       where t.id = c
                         and public.adv_key(t.advertiser) is not null
                         and public.adv_key(mc.advertiser) = public.adv_key(t.advertiser))));
$$;

-- 수정할 수 있는가 — 그 캠페인 또는 같은 광고주 캠페인에서 마스터 · 운영진
create or replace function public.can_edit(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.campaign_members m
     where m.user_id = auth.uid() and m.role in ('master','editor')
       and (m.campaign_id = c
            or exists(select 1
                        from public.campaigns t
                        join public.campaigns mc on mc.id = m.campaign_id
                       where t.id = c
                         and public.adv_key(t.advertiser) is not null
                         and public.adv_key(mc.advertiser) = public.adv_key(t.advertiser))));
$$;
-- is_master(c) 는 그대로 — 멤버 초대 · 삭제 같은 캠페인 관리는 그 캠페인에서만

-- 프로필 — 같은 광고주 캠페인의 멤버끼리 이름이 보이게
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_super()
         or exists(select 1 from public.campaign_members m2
                    where m2.user_id = public.profiles.id and public.is_member(m2.campaign_id)));

-- 코드로 같은 광고주의 캠페인 목록 — 캠페인 고르기 · 전체 캠페인에서 이동할 때 쓴다.
-- 돌려주는 code 는 들어온 코드와 같은 종류(뷰어 코드면 뷰어 코드, 운영진 코드면 운영진 코드)
create or replace function public.adv_campaigns_by_code(p_code text)
returns table(id uuid, name text, start_date date, end_date date, code text, is_self boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  src public.campaigns%rowtype;
  k text := upper(btrim(coalesce(p_code,'')));
  staff boolean;
begin
  if k = '' then return; end if;
  select * into src from public.campaigns c
   where upper(c.share_code) = k or upper(c.staff_code) = k limit 1;
  if not found then return; end if;
  staff := upper(coalesce(src.staff_code,'')) = k;
  return query
  select c.id, c.name, c.start_date, c.end_date,
         case when staff then c.staff_code else c.share_code end, c.id = src.id
    from public.campaigns c
   where c.id = src.id
      or (public.adv_key(src.advertiser) is not null
          and public.adv_key(c.advertiser) = public.adv_key(src.advertiser))
   order by c.start_date desc nulls last, c.name;
end $$;
revoke all on function public.adv_campaigns_by_code(text) from public;
grant execute on function public.adv_campaigns_by_code(text) to anon, authenticated;

-- 전체 캠페인 메뉴 — 이동용 code 열을 더한다 (돌려주는 열이 바뀌어 지우고 다시 만든다)
drop function if exists public.overview_by_code(text);
create or replace function public.overview_by_code(p_code text)
returns table(id uuid, name text, start_date date, end_date date, updated_at timestamptz, is_self boolean,
              media jsonb, lines jsonb, tv jsonb, ooh jsonb,
              net numeric, imp numeric, click numeric, view numeric, code text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  src public.campaigns%rowtype;
  k text := upper(btrim(coalesce(p_code,'')));
  staff boolean;
  m jsonb;
begin
  if k = '' then return; end if;
  select * into src from public.campaigns c
   where upper(c.share_code) = k or upper(c.staff_code) = k limit 1;
  if not found then return; end if;
  staff := upper(coalesce(src.staff_code,'')) = k;
  m := src.doc->'campaign'->'menus'->'overview';
  -- 메뉴를 끈 캠페인이면 아무것도 돌려주지 않는다
  if coalesce(m->>'on','') = 'false' then return; end if;
  -- 뷰어 코드는 "광고주에게 보이기" 를 켠 경우에만 (멤버로 로그인한 시행사는 미리 볼 수 있다)
  if not staff and coalesce(m->>'viewer','') <> 'true'
     and not (auth.uid() is not null and (public.is_member(src.id) or public.is_super())) then
    return;
  end if;
  return query
  select c.id, c.name, c.start_date, c.end_date, c.updated_at, c.id = src.id,
         c.doc->'campaign'->'media',
         coalesce((select jsonb_agg(jsonb_build_object('gross',l->'gross','net',l->'net','start',l->'start','end',l->'end'))
                     from jsonb_array_elements(case when jsonb_typeof(c.doc->'lines')='array'
                                                    then c.doc->'lines' else '[]'::jsonb end) l),'[]'::jsonb),
         jsonb_build_object('plan',c.doc->'tv'->'plan','spots',c.doc->'tv'->'spots'),
         c.doc->'ooh'->'plan',
         s.net, s.imp, s.click, s.view,
         case when staff then c.staff_code else c.share_code end
    from public.campaigns c
    left join lateral (select sum(d.net)::numeric as net, sum(d.imp)::numeric as imp,
                              sum(d.click)::numeric as click, sum(d.view)::numeric as view
                         from public.daily_stats d where d.campaign_id = c.id) s on true
   where c.id = src.id
      or (public.adv_key(src.advertiser) is not null
          and public.adv_key(c.advertiser) = public.adv_key(src.advertiser))
   order by c.start_date nulls last, c.name;
end $$;
revoke all on function public.overview_by_code(text) from public;
grant execute on function public.overview_by_code(text) to anon, authenticated;

-- 전체 캠페인 › 소재 콜라주 (v83) — 같은 광고주 캠페인들의 소재 이름 · 이미지(또는 유튜브 링크)만.
-- 전체 캠페인 함수와 같은 규칙: 메뉴를 끈 캠페인은 없음, 뷰어 코드는 "광고주에게 보이기" 를 켠 경우에만
create or replace function public.creatives_by_code(p_code text)
returns table(id uuid, name text, start_date date, is_self boolean, code text, creatives jsonb, ooh jsonb)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  src public.campaigns%rowtype;
  k text := upper(btrim(coalesce(p_code,'')));
  staff boolean;
  m jsonb;
begin
  if k = '' then return; end if;
  select * into src from public.campaigns c
   where upper(c.share_code) = k or upper(c.staff_code) = k limit 1;
  if not found then return; end if;
  staff := upper(coalesce(src.staff_code,'')) = k;
  m := src.doc->'campaign'->'menus'->'overview';
  if coalesce(m->>'on','') = 'false' then return; end if;
  if not staff and coalesce(m->>'viewer','') <> 'true'
     and not (auth.uid() is not null and (public.is_member(src.id) or public.is_super())) then
    return;
  end if;
  return query
  select c.id, c.name, c.start_date, c.id = src.id,
         case when staff then c.staff_code else c.share_code end,
         coalesce((select jsonb_agg(jsonb_build_object('name',x->'name','img',x->'img','yt',x->'yt','g',x->'g','media',x->'media'))
                     from jsonb_array_elements(case when jsonb_typeof(c.doc->'creatives')='array'
                                                    then c.doc->'creatives' else '[]'::jsonb end) x),'[]'::jsonb),
         case when coalesce((c.doc->'campaign'->'media'->>'ooh')::boolean,false)
              then coalesce((select jsonb_agg(jsonb_build_object('name',y->'name','img',y->'img'))
                               from jsonb_array_elements(case when jsonb_typeof(c.doc->'ooh'->'cr')='array'
                                                              then c.doc->'ooh'->'cr' else '[]'::jsonb end) y),'[]'::jsonb)
              else '[]'::jsonb end
    from public.campaigns c
   where c.id = src.id
      or (public.adv_key(src.advertiser) is not null
          and public.adv_key(c.advertiser) = public.adv_key(src.advertiser))
   order by c.start_date nulls last, c.name;
end $$;
revoke all on function public.creatives_by_code(text) from public;
grant execute on function public.creatives_by_code(text) to anon, authenticated;


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
