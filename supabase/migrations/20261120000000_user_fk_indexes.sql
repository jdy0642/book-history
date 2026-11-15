-- =========================================================
-- 계정을 지울 때 쓰는 외래 키 인덱스
-- (Supabase SQL Editor 에서 실행)
--
-- auth.users 한 행을 지우면 Postgres 가 그 사용자를 가리키는 행을 찾아 비우거나(set null) 지운다(cascade).
-- 인덱스가 없으면 그때마다 표 전체를 훑는다. books·reading_logs 는 모든 가족의 데이터가 쌓이는 표라
-- 사용자가 늘수록 탈퇴가 느려지므로 인덱스를 둔다. (profiles·family_members 는 이미 인덱스가 있다)
-- =========================================================

create index reading_logs_reader_idx on public.reading_logs (reader_user_id) where reader_user_id is not null;
create index books_created_by_idx on public.books (created_by) where created_by is not null;
create index families_created_by_idx on public.families (created_by) where created_by is not null;
create index family_invites_created_by_idx on public.family_invites (created_by);

-- 마지막 구성원이 빠져 가족이 지워질 때(20261119 트리거) 초대도 family_id 로 찾아 지운다
create index family_invites_family_idx on public.family_invites (family_id);
