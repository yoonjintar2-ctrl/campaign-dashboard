-- =====================================================================
-- 2026-10-07 저장 이력(campaign_history)에서 소재 이미지 지우기
-- 결정: 소재 이미지 · 미리보기 영상은 최신 문서(campaigns.doc)에만 두고, 저장 이력에서는 모두 뺀다.
--       이력의 입력 시트 · 라인 · 설정 · 이슈 등은 그대로 남는다(복구용).
--       v109 부터 새로 쌓이는 이력에는 사이트가 처음부터 이미지를 넣지 않는다.
-- 빼는 것: creatives[].img · creatives[].clip · crAssets{}.img · crAssets{}.clip · ooh.cr[].img
--         (광고주 · 대행사 로고는 그대로)
-- Supabase → SQL Editor 에서 실행. ⚠ 지운 이미지는 되돌릴 수 없다(최신 문서의 이미지는 그대로).
-- =====================================================================

-- ─── 1단계 — 아래 블록 전체를 실행. 결과가 「UPDATE 0」 이 나올 때까지 여러 번 실행 (한 번에 100벌씩) ───
set session characteristics as transaction read write;   -- 용량 초과로 읽기 전용이 됐을 때만 필요(아니면 영향 없음)
set statement_timeout = '10min';

update public.campaign_history h
   set doc = h.doc
     || case when jsonb_typeof(h.doc->'creatives') = 'array' then jsonb_build_object('creatives',
          (select coalesce(jsonb_agg(case when jsonb_typeof(c) = 'object' then c - 'img' - 'clip' else c end order by n), '[]'::jsonb)
             from jsonb_array_elements(h.doc->'creatives') with ordinality as t(c, n)))
        else '{}'::jsonb end
     || case when jsonb_typeof(h.doc->'crAssets') = 'object' then jsonb_build_object('crAssets',
          (select coalesce(jsonb_object_agg(k, case when jsonb_typeof(v) = 'object' then v - 'img' - 'clip' else v end), '{}'::jsonb)
             from jsonb_each(h.doc->'crAssets') as e(k, v)))
        else '{}'::jsonb end
     || case when jsonb_typeof(h.doc->'ooh'->'cr') = 'array' then jsonb_build_object('ooh',
          (h.doc->'ooh') || jsonb_build_object('cr',
            (select coalesce(jsonb_agg(case when jsonb_typeof(c) = 'object' then c - 'img' - 'clip' else c end order by n), '[]'::jsonb)
               from jsonb_array_elements(h.doc->'ooh'->'cr') with ordinality as t(c, n))))
        else '{}'::jsonb end
     || '{"noMedia":1}'::jsonb
 where h.id in (
   select id from public.campaign_history
    where doc is not null and not (doc ? 'noMedia')
    order by id
    limit 100);

-- 남은 수 (0 이 되면 2단계로)
select count(*) as remaining
  from public.campaign_history
 where doc is not null and not (doc ? 'noMedia');


-- ─── 2단계 — 아래 한 줄만 따로 실행 (지운 자리를 실제로 돌려받는다. 1~2분 걸릴 수 있음) ───
vacuum full public.campaign_history;


-- ─── 3단계 — 용량 확인 (무료 한도: DB 500MB) ───
select pg_size_pretty(pg_database_size(current_database()))              as database_total,
       pg_size_pretty(pg_total_relation_size('public.campaign_history')) as campaign_history,
       pg_size_pretty(pg_total_relation_size('public.campaigns'))        as campaigns,
       pg_size_pretty(pg_total_relation_size('public.daily_stats'))      as daily_stats;
