-- =========================================================
-- 회원 탈퇴
-- (Supabase SQL Editor 에서 실행)
--
-- 탈퇴는 계정(auth.users)을 지우는 것으로 끝난다. 나머지는 외래 키가 처리한다:
--  - 프로필·가족 구성원·내가 만든 초대: on delete cascade
--  - 기록의 "읽어준 사람"·책의 등록자·가족의 "만든 사람": on delete set null
-- 가족 정리(마지막 구성원이면 가족 삭제, 만든 사람 승계)는 다음 마이그레이션의 트리거가 맡는다
-- (20261119000000_family_member_cleanup.sql).
-- =========================================================

-- 지금은 가족을 만든 사람의 계정이 지워지면 가족 전체가 함께 지워진다 (on delete cascade).
-- 남은 가족의 기록이 사라지지 않도록 "만든 사람" 칸만 비우게 바꾼다.
alter table public.families alter column created_by drop not null;
alter table public.families drop constraint families_created_by_fkey;
alter table public.families
  add constraint families_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
