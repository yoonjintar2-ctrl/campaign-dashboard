-- =====================================================================
-- 2026-10-07 저장 이력(campaign_history)은 최근 7일만 남긴다
-- · 저장할 때마다(이력 한 벌이 쌓일 때마다) 7일 지난 이력을 서버가 지운다 — 모든 캠페인 공통
-- · 사이트(클라이언트)에는 이력 삭제 권한(RLS)이 없으므로 security definer 함수가 대신 지운다
-- · 7일 동안 저장이 없던 캠페인의 이력도 다른 캠페인이 저장할 때 함께 정리된다
-- Supabase → SQL Editor 에서 실행. ⚠ 지운 이력은 되돌릴 수 없다.
-- =====================================================================

create or replace function public.prune_campaign_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.campaign_history where created_at < now() - interval '7 days';
  return null;
end $$;

drop trigger if exists campaign_history_prune on public.campaign_history;
create trigger campaign_history_prune
  after insert on public.campaign_history
  for each statement execute function public.prune_campaign_history();

-- 지금 있는 7일 지난 이력도 바로 지운다
delete from public.campaign_history where created_at < now() - interval '7 days';

-- ─── 따로 한 줄 실행 — 지운 자리를 실제로 돌려받는다 ───
-- vacuum full public.campaign_history;
