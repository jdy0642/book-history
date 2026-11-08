# 📚 책 읽어준 날

아이에게 읽어준 책을 기록하는 앱. 전체 계획은 [PLAN.md](PLAN.md) 참고.

- Next.js 15 (App Router, TypeScript) + Tailwind CSS 4
- Supabase (PostgreSQL, 인증, RLS)
- Vercel 배포 예정

## 로컬 실행

Node 20 이상이 필요합니다 (`.nvmrc` = 22).

```bash
nvm use
npm install
cp .env.example .env.local   # 값 채우기 (아래 참고)
npm run dev                  # http://localhost:3000
```

홈 화면에 Supabase 연결 상태가 표시됩니다.

## Supabase 연결하기

1. https://supabase.com 에서 프로젝트 생성 (리전: Northeast Asia (Seoul) 추천)
2. **Project Settings → API** 에서 `Project URL`, `Publishable key` 를 `.env.local` 에 넣기
3. **SQL Editor** 에서 `supabase/migrations/20261108000000_init.sql` 내용을 붙여넣고 실행
4. `npm run dev` 재시작 → 홈에 "✅ Supabase 연결 및 DB 테이블 확인 완료" 가 보이면 성공

## Vercel 배포하기

1. 이 저장소를 GitHub 에 올리기
2. https://vercel.com 에서 **Add New → Project** 로 저장소 가져오기
3. **Environment Variables** 에 `.env.local` 과 같은 값 입력 → Deploy

## 폴더 구조

```
src/
  app/                 화면 (App Router)
  lib/supabase/        Supabase 클라이언트 (브라우저 / 서버 / 미들웨어)
  middleware.ts        요청마다 로그인 세션 갱신
supabase/migrations/   DB 스키마 + RLS 정책
```

## 데이터 보호 원칙

`family_id` 가 붙은 모든 데이터는 같은 가족 구성원만 읽고 쓸 수 있도록 DB 의 RLS 로 강제합니다.
가족 생성·초대 수락은 RPC(`create_family`, `accept_family_invite`) 로만 가능합니다.
