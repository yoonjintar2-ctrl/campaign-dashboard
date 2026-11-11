-- =====================================================================
-- v171 (2026-11-11) 데이터 접수함 — 받은 엑셀 · PDF 와 요청 글을 보관한다
-- Supabase → SQL Editor 에 이 파일 내용을 붙여 넣고 한 번 실행하세요. (여러 번 실행해도 됩니다)
-- (2026-11-10_intake.sql 을 대신합니다 — 그 파일을 이미 실행했어도 이 파일을 실행하면 맞춰집니다)
--
--   · 모든 캠페인이 함께 쓰는 접수함 하나 — 운영 권한(슈퍼마스터 · 마스터) 계정만 보고 올리고 지운다
--   · 파일은 비공개 버킷 intake 에 'all/<접수 id>/0.<확장자>' 로 저장된다
--   · 파일 없이 요청 글만 남길 수 있다(path = '')
--   · 상태: 대기(접수) → 반영(완료) · 보류
-- =====================================================================

-- ① 버킷 — 비공개 · 파일 한 개 30MB 까지
insert into storage.buckets (id, name, public, file_size_limit)
values ('intake', 'intake', false, 31457280)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- ② 접수 목록
create table if not exists public.intake_files(
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid references public.campaigns(id) on delete set null,   -- 올릴 때 보고 있던 캠페인(참고용)
  camp          text not null default '',          -- 그 캠페인 이름 (광고주 · 캠페인)
  area          text not null default '',
  kind          text not null default '',          -- 매체 · 항목
  month         text not null default '',          -- 기준 월 'YYYY-MM'
  note          text not null default '',          -- 전할 말
  name          text not null,                     -- 원래 파일명 (요청만이면 '(요청)')
  size          bigint not null default 0,
  path          text not null default '',          -- 저장소 경로 (요청만이면 '')
  detected      text not null default '',          -- 사이트가 알아본 형식
  status        text not null default 'wait' check (status in ('wait','done','hold')),
  status_note   text not null default '',
  uploader_id   uuid default auth.uid() references auth.users(id) on delete set null,
  uploader_name text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- 예전 파일(11-10)로 이미 만든 경우 맞추기
alter table public.intake_files add column if not exists camp text not null default '';
alter table public.intake_files alter column campaign_id drop not null;
alter table public.intake_files alter column path set default '';
create index if not exists intake_files_time_idx on public.intake_files(created_at desc);

alter table public.intake_files enable row level security;

drop policy if exists intake_read on public.intake_files;
create policy intake_read on public.intake_files
  for select to authenticated using (public.is_app_master());

drop policy if exists intake_ins on public.intake_files;
create policy intake_ins on public.intake_files
  for insert to authenticated with check (public.is_app_master() and uploader_id = auth.uid());

drop policy if exists intake_upd on public.intake_files;
create policy intake_upd on public.intake_files
  for update to authenticated using (public.is_app_master()) with check (public.is_app_master());

drop policy if exists intake_del on public.intake_files;
create policy intake_del on public.intake_files
  for delete to authenticated using (public.is_app_master());

grant select, insert, update, delete on public.intake_files to authenticated;

-- ③ 저장소 권한 — 운영 권한 계정만
drop policy if exists intake_obj_read on storage.objects;
create policy intake_obj_read on storage.objects
  for select to authenticated using (bucket_id = 'intake' and public.is_app_master());

drop policy if exists intake_obj_ins on storage.objects;
create policy intake_obj_ins on storage.objects
  for insert to authenticated with check (bucket_id = 'intake' and public.is_app_master());

drop policy if exists intake_obj_del on storage.objects;
create policy intake_obj_del on storage.objects
  for delete to authenticated using (bucket_id = 'intake' and public.is_app_master());
