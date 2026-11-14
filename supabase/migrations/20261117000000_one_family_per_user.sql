-- =========================================================
-- 한 계정 한 가족을 DB 제약으로 보장
-- (Supabase SQL Editor 에서 실행)
--
-- 지금까지는 함수 안에서 "이미 가족이 있는지" 확인만 했다. 같은 계정으로 거의 동시에
-- 두 번 요청하면(가족 만들기 두 번, 초대 두 개 수락 등) 둘 다 확인을 통과할 수 있다.
-- user_id 를 유니크로 만들어 그런 경우에도 두 번째 요청이 실패하게 한다.
--
-- 이미 두 가족에 속한 계정이 있으면 인덱스 생성이 실패한다. 미리 확인하려면:
--   select user_id, count(*) from public.family_members group by user_id having count(*) > 1;
-- =========================================================

create unique index family_members_user_key on public.family_members (user_id);
drop index public.family_members_user_idx; -- 유니크 인덱스가 같은 조회를 맡는다

-- ---------- 가족 만들기: 동시에 요청해 유니크 제약에 걸려도 같은 안내(P0003) ----------
create or replace function public.create_family(family_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'already in a family' using errcode = 'P0003';
  end if;

  insert into public.families (name, created_by)
  values (family_name, auth.uid())
  returning id into new_id;

  begin
    insert into public.family_members (family_id, user_id, role)
    values (new_id, auth.uid(), 'owner');
  exception when unique_violation then
    -- 함수 전체가 한 트랜잭션이라 위에서 만든 가족도 함께 취소된다
    raise exception 'already in a family' using errcode = 'P0003';
  end;

  return new_id;
end;
$$;

-- ---------- 초대 수락: 이미 그 가족이면 그대로, 다른 가족이면 거절 ----------
create or replace function public.accept_family_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select family_id into fid
  from public.family_invites
  where token = invite_token and expires_at > now();
  if fid is null then
    raise exception 'invalid or expired invite' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.family_members where user_id = auth.uid() and family_id <> fid) then
    raise exception 'already in another family' using errcode = 'P0003';
  end if;

  begin
    -- 충돌 대상을 (가족, 사용자)로 한정: 같은 가족에 다시 들어오면 그대로 두고,
    -- 그 사이 다른 가족에 들어갔다면(user_id 충돌) 조용히 넘어가지 않고 거절한다
    insert into public.family_members (family_id, user_id, role)
    values (fid, auth.uid(), 'member')
    on conflict (family_id, user_id) do nothing;
  exception when unique_violation then
    raise exception 'already in another family' using errcode = 'P0003';
  end;

  return fid;
end;
$$;

-- create or replace 는 기존 실행 권한을 그대로 둔다 (authenticated 만 실행 가능)
