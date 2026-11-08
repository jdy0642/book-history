-- =========================================================
-- 책 읽어준 날 — 초기 스키마
-- 원칙: family_id 가 붙은 모든 데이터는 그 가족 구성원만 읽고 쓸 수 있다 (RLS)
-- =========================================================

-- ---------- 프로필 (auth.users 와 1:1) ----------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '보호자' check (char_length(display_name) between 1 and 30),
  created_at   timestamptz not null default now()
);

-- 회원가입 시 프로필 자동 생성
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), '보호자')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 가족 ----------
create table public.families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 30),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id  uuid not null references public.families (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_idx on public.family_members (user_id);

create table public.family_invites (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  token      text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

-- RLS 안에서 재귀를 피하기 위한 헬퍼 (security definer 로 RLS 우회)
create function public.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fid and user_id = auth.uid()
  );
$$;

create function public.is_family_owner(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ---------- 아이 ----------
create table public.children (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 1 and 20),
  birth_month text check (birth_month ~ '^\d{4}-(0[1-9]|1[0-2])$'), -- 'YYYY-MM', 선택
  created_at  timestamptz not null default now()
);
create index children_family_idx on public.children (family_id);

-- ---------- 책 (모든 사용자가 공유하는 카탈로그) ----------
create table public.books (
  id         uuid primary key default gen_random_uuid(),
  isbn       text unique,
  title      text not null check (char_length(title) between 1 and 300),
  authors    text[] not null default '{}',
  publisher  text,
  cover_url  text,
  source     text not null default 'manual' check (source in ('kakao', 'manual')),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- 읽기 기록 ----------
create table public.reading_logs (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families (id) on delete cascade,
  book_id        uuid not null references public.books (id) on delete restrict,
  read_on        date not null default current_date,
  reader_user_id uuid default auth.uid() references auth.users (id) on delete set null,
  memo           text check (char_length(memo) <= 500),
  reaction       text check (reaction in ('love', 'like', 'meh')),
  created_at     timestamptz not null default now()
);
create index reading_logs_family_date_idx on public.reading_logs (family_id, read_on desc);
create index reading_logs_book_idx on public.reading_logs (book_id);

create table public.reading_log_children (
  reading_log_id uuid not null references public.reading_logs (id) on delete cascade,
  child_id       uuid not null references public.children (id) on delete cascade,
  primary key (reading_log_id, child_id)
);
create index reading_log_children_child_idx on public.reading_log_children (child_id);

-- =========================================================
-- RPC (여러 테이블을 한 번에 다뤄야 하는 동작)
-- =========================================================

-- 가족 만들기: 가족 생성 + 나를 owner 로 등록
create function public.create_family(family_name text)
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

  insert into public.families (name, created_by)
  values (family_name, auth.uid())
  returning id into new_id;

  insert into public.family_members (family_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  return new_id;
end;
$$;

-- 초대 수락: 유효한 토큰이면 가족 구성원으로 추가
create function public.accept_family_invite(invite_token text)
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
    raise exception 'invalid or expired invite';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (fid, auth.uid(), 'member')
  on conflict do nothing;

  return fid;
end;
$$;

revoke execute on function public.create_family(text) from anon;
revoke execute on function public.accept_family_invite(text) from anon;

-- =========================================================
-- RLS 정책
-- =========================================================
alter table public.profiles             enable row level security;
alter table public.families             enable row level security;
alter table public.family_members       enable row level security;
alter table public.family_invites       enable row level security;
alter table public.children             enable row level security;
alter table public.books                enable row level security;
alter table public.reading_logs         enable row level security;
alter table public.reading_log_children enable row level security;

-- profiles: 나 자신 + 같은 가족 구성원의 프로필만 보임, 수정은 본인만
create policy "profiles_select" on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.family_members fm
      where fm.user_id = profiles.id and public.is_family_member(fm.family_id)
    )
  );
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- families: 구성원만 조회, owner 만 수정/삭제 (생성은 create_family RPC 로)
create policy "families_select" on public.families for select to authenticated
  using (public.is_family_member(id));
create policy "families_update" on public.families for update to authenticated
  using (public.is_family_owner(id)) with check (public.is_family_owner(id));
create policy "families_delete" on public.families for delete to authenticated
  using (public.is_family_owner(id));

-- family_members: 같은 가족끼리 조회, owner 는 내보내기 가능, 본인은 탈퇴 가능
-- (추가는 RPC 로만)
create policy "family_members_select" on public.family_members for select to authenticated
  using (public.is_family_member(family_id));
create policy "family_members_delete" on public.family_members for delete to authenticated
  using (user_id = auth.uid() or public.is_family_owner(family_id));

-- family_invites: 구성원만 생성/조회/삭제
create policy "family_invites_select" on public.family_invites for select to authenticated
  using (public.is_family_member(family_id));
create policy "family_invites_insert" on public.family_invites for insert to authenticated
  with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "family_invites_delete" on public.family_invites for delete to authenticated
  using (public.is_family_member(family_id));

-- children: 가족 구성원만 전부 가능
create policy "children_all" on public.children for all to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- books: 로그인한 사람은 누구나 조회·추가, 수정은 직접 입력한 사람만
create policy "books_select" on public.books for select to authenticated
  using (true);
create policy "books_insert" on public.books for insert to authenticated
  with check (created_by = auth.uid());
create policy "books_update_own_manual" on public.books for update to authenticated
  using (created_by = auth.uid() and source = 'manual')
  with check (created_by = auth.uid() and source = 'manual');

-- reading_logs: 가족 구성원만 전부 가능
create policy "reading_logs_all" on public.reading_logs for all to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- reading_log_children: 기록과 아이가 모두 "내 가족" 이고 서로 같은 가족이어야 함
create policy "reading_log_children_select" on public.reading_log_children for select to authenticated
  using (
    exists (
      select 1 from public.reading_logs rl
      where rl.id = reading_log_id and public.is_family_member(rl.family_id)
    )
  );
create policy "reading_log_children_insert" on public.reading_log_children for insert to authenticated
  with check (
    exists (
      select 1
      from public.reading_logs rl
      join public.children c on c.family_id = rl.family_id
      where rl.id = reading_log_id
        and c.id = child_id
        and public.is_family_member(rl.family_id)
    )
  );
create policy "reading_log_children_delete" on public.reading_log_children for delete to authenticated
  using (
    exists (
      select 1 from public.reading_logs rl
      where rl.id = reading_log_id and public.is_family_member(rl.family_id)
    )
  );
