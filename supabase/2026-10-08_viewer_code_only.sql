-- =====================================================================
-- v121 (2026-10-08) 공유 링크 코드는 뷰어 코드만 — 운영진 코드 링크를 없앤다
-- Supabase → SQL Editor 에 이 파일 전체를 붙여 넣고 한 번 실행하세요. (여러 번 실행해도 됩니다)
--
--   예전 운영진은 마스터 계정이 되었다(v117 회원 시스템). 로그인 없이 링크(?code=)로 들어오는 사람은
--   뷰어(조회 전용)뿐이다. 코드로 캠페인을 여는 함수들이 뷰어 코드(share_code)만 찾고,
--   운영진 코드(staff_code)는 어떤 함수도 받지도 · 돌려주지도 않는다. (열은 기록으로 남겨 둔다)
-- =====================================================================

-- 코드로 캠페인 열기 — 뷰어 코드만 (돌려주는 열은 그대로 · code_kind 는 늘 'viewer')
create or replace function public.open_by_code(p_code text)
returns table(id uuid, name text, advertiser text, doc jsonb, code_kind text)
language sql security definer set search_path = public as $$
  select c.id, c.name, c.advertiser, c.doc, 'viewer'::text
  from public.campaigns c
  where upper(c.share_code) = upper(trim(p_code))
  limit 1;
$$;

-- 코드로 같은 광고주의 캠페인 목록 — 뷰어 코드만, 돌려주는 코드도 뷰어 코드
create or replace function public.adv_campaigns_by_code(p_code text)
returns table(id uuid, name text, start_date date, end_date date, code text, is_self boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  src public.campaigns%rowtype;
  k text := upper(btrim(coalesce(p_code,'')));
begin
  if k = '' then return; end if;
  select * into src from public.campaigns c where upper(c.share_code) = k limit 1;
  if not found then return; end if;
  return query
  select c.id, c.name, c.start_date, c.end_date, c.share_code, c.id = src.id
    from public.campaigns c
   where c.id = src.id
      or (public.adv_key(src.advertiser) is not null
          and public.adv_key(c.advertiser) = public.adv_key(src.advertiser))
   order by c.start_date desc nulls last, c.name;
end $$;

-- 전체 캠페인 메뉴 — 뷰어 코드만 ("광고주에게 보이기" 를 켠 캠페인, 또는 로그인해서 볼 수 있는 사람의 미리보기)
create or replace function public.overview_by_code(p_code text)
returns table(id uuid, name text, start_date date, end_date date, updated_at timestamptz, is_self boolean,
              media jsonb, lines jsonb, tv jsonb, ooh jsonb,
              net numeric, imp numeric, click numeric, view numeric, code text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  src public.campaigns%rowtype;
  k text := upper(btrim(coalesce(p_code,'')));
  m jsonb;
begin
  if k = '' then return; end if;
  select * into src from public.campaigns c where upper(c.share_code) = k limit 1;
  if not found then return; end if;
  m := src.doc->'campaign'->'menus'->'overview';
  if coalesce(m->>'on','') = 'false' then return; end if;
  if coalesce(m->>'viewer','') <> 'true'
     and not (auth.uid() is not null and public.is_member(src.id)) then
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
         c.share_code
    from public.campaigns c
    left join lateral (select sum(d.net)::numeric as net, sum(d.imp)::numeric as imp,
                              sum(d.click)::numeric as click, sum(d.view)::numeric as view
                         from public.daily_stats d where d.campaign_id = c.id) s on true
   where c.id = src.id
      or (public.adv_key(src.advertiser) is not null
          and public.adv_key(c.advertiser) = public.adv_key(src.advertiser))
   order by c.start_date nulls last, c.name;
end $$;

-- 전체 캠페인 › 소재 콜라주 — 뷰어 코드만
create or replace function public.creatives_by_code(p_code text)
returns table(id uuid, name text, start_date date, is_self boolean, code text, creatives jsonb, ooh jsonb)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  src public.campaigns%rowtype;
  k text := upper(btrim(coalesce(p_code,'')));
  m jsonb;
begin
  if k = '' then return; end if;
  select * into src from public.campaigns c where upper(c.share_code) = k limit 1;
  if not found then return; end if;
  m := src.doc->'campaign'->'menus'->'overview';
  if coalesce(m->>'on','') = 'false' then return; end if;
  if coalesce(m->>'viewer','') <> 'true'
     and not (auth.uid() is not null and public.is_member(src.id)) then
    return;
  end if;
  return query
  select c.id, c.name, c.start_date, c.id = src.id, c.share_code,
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

-- 마스터용 코드 목록 — 운영진 코드는 더 이상 내주지 않는다 (열 모양은 그대로, 값은 비움)
create or replace function public.campaign_codes()
returns table(id uuid, share_code text, staff_code text)
language sql stable security definer set search_path = public as $$
  select c.id, c.share_code, null::text from public.campaigns c where public.is_app_master();
$$;

-- 실행 권한 (create or replace 는 권한을 유지하지만, 처음 만드는 DB 를 위해 한 번 더)
revoke all on function public.open_by_code(text)          from public;
revoke all on function public.adv_campaigns_by_code(text) from public;
revoke all on function public.overview_by_code(text)      from public;
revoke all on function public.creatives_by_code(text)     from public;
grant execute on function public.open_by_code(text)          to anon, authenticated;
grant execute on function public.adv_campaigns_by_code(text) to anon, authenticated;
grant execute on function public.overview_by_code(text)      to anon, authenticated;
grant execute on function public.creatives_by_code(text)     to anon, authenticated;
revoke all on function public.campaign_codes() from public, anon;
grant execute on function public.campaign_codes() to authenticated;

notify pgrst, 'reload schema';
