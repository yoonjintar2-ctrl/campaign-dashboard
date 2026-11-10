-- =====================================================================
-- v160 (2026-11-10) 자료 접수함 — 데이터 입력 메뉴에서 올린 엑셀 · PDF 를 보관한다
-- Supabase → SQL Editor 에 이 파일 내용을 붙여 넣고 한 번 실행하세요. (여러 번 실행해도 됩니다)
--
--   · 사이트가 바로 읽지 못하는 자료(위클리 · 먼슬리 리포트, 큐시트 등)를 캠페인별로 접수한다
--   · 파일은 비공개 버킷 intake 에 '<캠페인 id>/<접수 id>/<파일명>' 으로 저장된다
--   · 그 캠페인의 멤버만 목록 · 파일을 볼 수 있고, 편집 권한(마스터 · 에디터)만 올리고 상태를 바꾼다
--   · 상태: 대기(접수) → 반영(완료) · 보류
-- =====================================================================

-- ① 버킷 — 비공개 · 파일 한 개 30MB 까지
insert into storage.buckets (id, name, public, file_size_limit)
values ('intake', 'intake', false, 31457280)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- ② 접수 목록
create table if not exists public.intake_files(
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  area          text not null default '',          -- tv · digital · ott · report …
  kind          text not null default '',          -- 자료 종류 (TV 위클리 리포트 등)
  month         text not null default '',          -- 기준 월 'YYYY-MM'
  note          text not null default '',          -- 올린 사람 메모
  name          text not null,                     -- 원래 파일명
  size          bigint not null default 0,
  path          text not null,                     -- 저장소 경로
  detected      text not null default '',          -- 사이트가 알아본 형식 (없으면 '')
  status        text not null default 'wait' check (status in ('wait','done','hold')),
  status_note   text not null default '',          -- 반영 · 보류 메모
  uploader_id   uuid default auth.uid() references auth.users(id) on delete set null,
  uploader_name text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists intake_files_camp_idx on public.intake_files(campaign_id, created_at desc);

alter table public.intake_files enable row level security;

drop policy if exists intake_read on public.intake_files;
create policy intake_read on public.intake_files
  for select to authenticated using (public.is_member(campaign_id) or public.is_app_master());

drop policy if exists intake_ins on public.intake_files;
create policy intake_ins on public.intake_files
  for insert to authenticated
  with check ((public.can_edit(campaign_id) or public.is_app_master()) and uploader_id = auth.uid());

drop policy if exists intake_upd on public.intake_files;
create policy intake_upd on public.intake_files
  for update to authenticated
  using (public.can_edit(campaign_id) or public.is_app_master())
  with check (public.can_edit(campaign_id) or public.is_app_master());

drop policy if exists intake_del on public.intake_files;
create policy intake_del on public.intake_files
  for delete to authenticated
  using (public.is_master(campaign_id) or public.is_app_master()
         or (uploader_id = auth.uid() and status = 'wait'));

grant select, insert, update, delete on public.intake_files to authenticated;

-- ③ 저장소 권한 — 경로 첫 폴더가 캠페인 id
drop policy if exists intake_obj_read on storage.objects;
create policy intake_obj_read on storage.objects
  for select to authenticated
  using (bucket_id = 'intake'
         and (public.is_member(((storage.foldername(name))[1])::uuid) or public.is_app_master()));

drop policy if exists intake_obj_ins on storage.objects;
create policy intake_obj_ins on storage.objects
  for insert to authenticated
  with check (bucket_id = 'intake'
         and (public.can_edit(((storage.foldername(name))[1])::uuid) or public.is_app_master()));

drop policy if exists intake_obj_del on storage.objects;
create policy intake_obj_del on storage.objects
  for delete to authenticated
  using (bucket_id = 'intake'
         and (public.is_master(((storage.foldername(name))[1])::uuid) or public.is_app_master()
              or owner = auth.uid()));
