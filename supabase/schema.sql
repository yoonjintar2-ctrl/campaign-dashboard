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
