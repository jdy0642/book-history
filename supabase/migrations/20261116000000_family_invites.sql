-- =========================================================
-- 가족 초대: 한 계정은 한 가족에만 + 초대 미리보기
-- (Supabase SQL Editor 에서 실행)
-- =========================================================

-- ---------- 가족 만들기: 이미 가족이 있으면 거절 ----------
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

  insert into public.family_members (family_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

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

  insert into public.family_members (family_id, user_id, role)
  values (fid, auth.uid(), 'member')
  on conflict do nothing;

  return fid;
end;
$$;

-- ---------- 초대 미리보기: 가입·수락 전에도 "누가 어느 가족에" 초대했는지 보여준다 ----------
-- 가족 이름과 초대한 사람 호칭만 돌려준다 (아이 정보 등은 노출하지 않음). 토큰을 아는 사람만 볼 수 있다.
create function public.get_invite_preview(invite_token text)
returns table (family_name text, inviter_name text, expired boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select f.name, p.display_name, i.expires_at <= now()
  from public.family_invites i
  join public.families f on f.id = i.family_id
  left join public.profiles p on p.id = i.created_by
  where i.token = invite_token;
$$;

-- ---------- 실행 권한: 로그인한 사용자만 ----------
-- Postgres 는 새 함수의 실행 권한을 PUBLIC(=모두)에게 주므로 anon 만 빼서는 막히지 않는다.
revoke execute on function public.create_family(text) from public, anon;
revoke execute on function public.accept_family_invite(text) from public, anon;
revoke execute on function public.create_reading_log(uuid, uuid, date, uuid[], text, text) from public, anon;
revoke execute on function public.update_reading_log(uuid, date, uuid[], text, text) from public, anon;
revoke execute on function public.upsert_kakao_book(text, text, text[], text, text) from public, anon;
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.accept_family_invite(text) to authenticated;
grant execute on function public.create_reading_log(uuid, uuid, date, uuid[], text, text) to authenticated;
grant execute on function public.update_reading_log(uuid, date, uuid[], text, text) to authenticated;
grant execute on function public.upsert_kakao_book(text, text, text[], text, text) to authenticated;

-- 초대 미리보기는 로그인 전(초대 링크를 처음 연 사람)에도 보여야 한다
grant execute on function public.get_invite_preview(text) to anon, authenticated;
