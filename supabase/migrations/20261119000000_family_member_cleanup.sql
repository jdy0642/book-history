-- =========================================================
-- 가족 구성원이 빠질 때의 정리 규칙을 트리거로
-- (Supabase SQL Editor 에서 실행)
--
-- 구성원은 탈퇴(delete_my_account) 말고도 빠질 수 있다:
-- Supabase 대시보드에서 계정 삭제, 본인이 가족에서 나가기, 만든 사람이 구성원 내보내기.
-- 어느 경우든 같은 규칙이 적용되도록 family_members 삭제 트리거로 옮긴다.
--  - 마지막 구성원이 빠지면: 가족을 지운다 (아이·기록·초대도 함께). 아무도 볼 수 없는 데이터를 남기지 않는다.
--  - 만든 사람(owner)이 모두 빠지면: 가장 먼저 들어온 구성원이 만든 사람이 된다.
-- =========================================================

create function public.handle_family_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 가족을 지우면서 구성원이 함께 지워지는 중이면 할 일이 없다
  if not exists (select 1 from public.families where id = old.family_id) then
    return null;
  end if;

  if not exists (select 1 from public.family_members where family_id = old.family_id) then
    delete from public.families where id = old.family_id;
  elsif not exists (select 1 from public.family_members where family_id = old.family_id and role = 'owner') then
    update public.family_members set role = 'owner'
    where family_id = old.family_id
      and user_id = (
        select user_id from public.family_members
        where family_id = old.family_id
        order by joined_at, user_id
        limit 1
      );
  end if;
  return null;
end;
$$;

create trigger on_family_member_removed
  after delete on public.family_members
  for each row execute function public.handle_family_member_removed();

-- 트리거 함수는 직접 부를 일이 없다
revoke execute on function public.handle_family_member_removed() from public, anon, authenticated;

-- ---------- 탈퇴: 계정만 지우면 나머지는 외래 키(cascade·set null)와 위 트리거가 처리한다 ----------
-- (운영 DB 는 정리 규칙을 함수 안에 둔 20261118 초안을 이미 실행했다. 그 DB 도 같은 함수가 되도록 다시 정의한다.
--  처음부터 순서대로 실행하는 DB 에서는 같은 내용을 한 번 더 정의할 뿐이다)
create or replace function public.delete_my_account()
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
