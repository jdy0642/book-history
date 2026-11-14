// 서버·클라이언트 컴포넌트 양쪽에서 쓰는 공용 클래스 ("use client" 파일에 두면 서버에서 문자열로 못 받는다)

export const inputClass =
  "w-full rounded-xl border border-foreground/15 bg-transparent px-4 py-3 text-base outline-none focus:border-accent";

export const buttonClass =
  "w-full rounded-xl bg-accent px-4 py-3 text-base font-semibold text-white disabled:opacity-60";

export const secondaryButtonClass =
  "w-full rounded-xl border border-foreground/15 px-4 py-3 text-base font-medium disabled:opacity-60";
