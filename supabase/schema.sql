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
