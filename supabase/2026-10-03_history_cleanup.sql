-- =====================================================================
-- 2026-10-03 저장 이력(campaign_history) 정리
-- 결정: 테슬라어택 iX3 캠페인(8eed5825-…)의 이력은 모두 남기고, 나머지 캠페인의 이력은 모두 지운다.
-- 저장 이력은 클라이언트에 삭제 권한(RLS)이 없어서 Supabase → SQL Editor 에서 실행해야 한다.
-- ⚠ 지운 이력은 되돌릴 수 없다.
-- =====================================================================

-- ① 지우기 전 — 캠페인별 이력 수 · 용량 확인
select h.campaign_id, c.name, count(*) as snapshots,
       pg_size_pretty(sum(pg_column_size(h.doc))::bigint) as stored
  from public.campaign_history h
  left join public.campaigns c on c.id = h.campaign_id
 group by 1, 2
 order by sum(pg_column_size(h.doc)) desc;

-- ② iX3 를 뺀 나머지 캠페인의 이력 삭제
delete from public.campaign_history
 where campaign_id <> '8eed5825-aa28-428c-a419-024d79d62fc3';

-- ③ 지운 뒤 — DB 전체 · 표별 용량 (무료 한도: DB 500MB)
select pg_size_pretty(pg_database_size(current_database()))              as database_total,
       pg_size_pretty(pg_total_relation_size('public.campaign_history')) as campaign_history,
       pg_size_pretty(pg_total_relation_size('public.campaigns'))        as campaigns,
       pg_size_pretty(pg_total_relation_size('public.daily_stats'))      as daily_stats;
