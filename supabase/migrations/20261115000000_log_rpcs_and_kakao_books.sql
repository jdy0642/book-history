-- =========================================================
-- 기록 저장/수정을 한 트랜잭션으로 + 카카오 책 저장
-- (Supabase SQL Editor 에서 실행)
-- 모든 함수는 security invoker: 호출한 사용자의 권한으로 실행되어 기존 RLS 가 그대로 적용된다.
-- 함수 안에서 하나라도 실패하면 전체가 롤백된다.
-- =========================================================

-- 읽은 날 기본값을 한국 날짜로 (앱은 항상 직접 넣지만, 기본값이 UTC 에 의존하지 않도록)
alter table public.reading_logs
  alter column read_on set default (now() at time zone 'Asia/Seoul')::date;

-- ---------- 기록 저장: 기록 + 읽어준 아이 ----------
create function public.create_reading_log(
  p_family_id uuid,
  p_book_id   uuid,
  p_read_on   date,
  p_child_ids uuid[],
  p_memo      text default null,
  p_reaction  text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if coalesce(array_length(p_child_ids, 1), 0) = 0 then
    raise exception 'at least one child is required' using errcode = '23514';
  end if;

  insert into public.reading_logs (family_id, book_id, read_on, memo, reaction)
  values (p_family_id, p_book_id, p_read_on, p_memo, p_reaction)
  returning id into new_id;

  insert into public.reading_log_children (reading_log_id, child_id)
  select new_id, unnest(p_child_ids);

  return new_id;
end;
$$;

-- ---------- 기록 수정: 날짜·메모·반응 + 아이 목록 교체 ----------
create function public.update_reading_log(
  p_id        uuid,
  p_read_on   date,
  p_child_ids uuid[],
  p_memo      text default null,
  p_reaction  text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(array_length(p_child_ids, 1), 0) = 0 then
    raise exception 'at least one child is required' using errcode = '23514';
  end if;

  update public.reading_logs
  set read_on = p_read_on, memo = p_memo, reaction = p_reaction
  where id = p_id;
  if not found then -- 없는 기록이거나 RLS 로 보이지 않는 다른 가족의 기록
    raise exception 'reading log not found' using errcode = 'P0002';
  end if;

  delete from public.reading_log_children
  where reading_log_id = p_id and child_id <> all (p_child_ids);

  insert into public.reading_log_children (reading_log_id, child_id)
  select p_id, unnest(p_child_ids)
  on conflict do nothing;
end;
$$;

-- ---------- 카카오 책: ISBN 으로 한 번만 저장하고 id 반환 ----------
create function public.upsert_kakao_book(
  p_isbn      text,
  p_title     text,
  p_authors   text[],
  p_publisher text,
  p_cover_url text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  book_id uuid;
begin
  insert into public.books (isbn, title, authors, publisher, cover_url, source)
  values (p_isbn, p_title, coalesce(p_authors, '{}'), p_publisher, p_cover_url, 'kakao')
  on conflict (isbn) do nothing
  returning id into book_id;

  if book_id is null then
    select id into book_id from public.books where isbn = p_isbn;
  end if;
  return book_id;
end;
$$;

revoke execute on function public.create_reading_log(uuid, uuid, date, uuid[], text, text) from anon;
revoke execute on function public.update_reading_log(uuid, date, uuid[], text, text) from anon;
revoke execute on function public.upsert_kakao_book(text, text, text[], text, text) from anon;
