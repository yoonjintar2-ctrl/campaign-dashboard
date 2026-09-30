-- =====================================================================
-- v78 (2026-09-30) 트렌드 리포트 게시판 보안 보강
-- Supabase → SQL Editor 에 이 파일 내용을 붙여 넣고 한 번 실행하세요. (여러 번 실행해도 됩니다)
--
--   ① "대외비" 글은 시행사 관리 계정(마스터 · 운영진)과 글쓴이에게만 보인다
--      (예전에는 대외비가 표시일 뿐이라 로그인 없이도 목록에서 읽혔다)
--   ② 대외비 글의 첨부 파일은 저장소 목록 조회로 경로를 알아낼 수 없다
--   ③ 글에 붙어 있는 파일은 저장소에서 바로 지울 수 없다
--      (글을 지운 뒤 남은 파일만 지울 수 있음 · 관리 계정은 전부)
--   ④ 게시판 설정 — 카테고리 목록은 관리 계정만 바꿀 수 있고, 매체명 사전은 누구나 추가
--
-- 화면 쪽 코드(v78)는 글을 먼저 지운 뒤 파일을 지우도록 순서를 바꿨다 — 이 SQL 과 함께 배포된다.
-- =====================================================================

-- 파일이 어느 글에 붙어 있는지 — 저장소 권한 안에서 쓰는 도우미.
-- (글 표는 직접 읽을 수 없게 막혀 있으므로 SECURITY DEFINER 로 판정만 돌려준다)
create or replace function public.trend_file_state(p_name text)
returns text language sql stable security definer set search_path=public as $$
  select case
    when exists(select 1 from public.trend_posts t, jsonb_array_elements(t.files) f
                 where t.secret and f->>'path' = p_name) then 'secret'
    when exists(select 1 from public.trend_posts t, jsonb_array_elements(t.files) f
                 where f->>'path' = p_name) then 'live'
    else 'orphan' end;
$$;
grant execute on function public.trend_file_state(text) to anon, authenticated;

-- ① 목록 뷰 — 대외비 글은 관리 계정 · 글쓴이에게만
create or replace view public.trend_posts_pub
with (security_invoker = off) as
select id,title,body,category,medium,tags,secret,files,link,thumb,bytes,
       author_id,author_name,guest_id,
       (guest_hash is not null and guest_hash <> '') as has_pw,
       created_at,updated_at
from public.trend_posts
where not secret
   or public.trend_is_admin()
   or (author_id is not null and author_id = auth.uid());
grant select on public.trend_posts_pub to anon, authenticated;

-- ② 저장소 읽기(목록) — 대외비 글의 파일은 관리 계정만
drop policy if exists trend_files_read on storage.objects;
create policy trend_files_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'trend'
         and (public.trend_file_state(name) <> 'secret' or public.trend_is_admin()));

-- ③ 저장소 지우기 — 글에 붙어 있지 않은 파일만 (관리 계정은 전부)
drop policy if exists trend_files_delete on storage.objects;
create policy trend_files_delete on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'trend'
         and (public.trend_file_state(name) = 'orphan' or public.trend_is_admin()));

-- ④ 게시판 설정
drop policy if exists trend_meta_write on public.trend_meta;
drop policy if exists trend_meta_ins   on public.trend_meta;
drop policy if exists trend_meta_upd   on public.trend_meta;
create policy trend_meta_ins on public.trend_meta
  for insert to anon, authenticated
  with check (k = 'media' or public.trend_is_admin());
create policy trend_meta_upd on public.trend_meta
  for update to anon, authenticated
  using (k = 'media' or public.trend_is_admin())
  with check (k = 'media' or public.trend_is_admin());
