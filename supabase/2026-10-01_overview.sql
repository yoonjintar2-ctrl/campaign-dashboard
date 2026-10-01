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
