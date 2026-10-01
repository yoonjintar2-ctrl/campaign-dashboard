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
--   전체 캠페인 메뉴의 함수(overview_by_code)도 캠페인 이동에 쓰는 코드를 함께 돌려주도록 바꾸고,
--   소재 콜라주 함수(creatives_by_code · v83)를 더한다. 예전에 실행했어도 한 번 더 실행하면 된다.
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
