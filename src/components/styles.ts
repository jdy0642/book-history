// 서버·클라이언트 컴포넌트 양쪽에서 쓰는 공용 클래스 ("use client" 파일에 두면 서버에서 문자열로 못 받는다)

export const inputClass =
  "w-full rounded-xl border border-foreground/15 bg-transparent px-4 py-3 text-base outline-none focus:border-accent";

export const buttonClass =
  "w-full rounded-xl bg-accent px-4 py-3 text-base font-semibold text-white disabled:opacity-60";

export const secondaryButtonClass =
  "w-full rounded-xl border border-foreground/15 px-4 py-3 text-base font-medium disabled:opacity-60";

export const cardClass = "rounded-xl border border-foreground/10 px-4 py-3";

/** 카드 모양의 라디오/체크박스 선택지 (선택되면 강조) */
export const optionCardClass = `${cardClass} flex cursor-pointer items-center gap-3 has-[:checked]:border-accent has-[:checked]:bg-accent/10`;

export const emptyStateClass = "rounded-xl bg-foreground/5 px-4 py-6 text-center text-sm text-muted";

/** 두 개 이상의 선택지를 붙여 놓은 탭 (로그인/회원가입, 책장 정렬 등) */
export const segmentedClass = "grid grid-cols-2 rounded-xl bg-foreground/5 p-1 text-sm font-medium";
export const segmentClass = (active: boolean) =>
  `rounded-lg py-2 text-center ${active ? "bg-background shadow-sm" : "text-muted"}`;

/** 강조 안내 상자 (초대 안내 등) */
export const hintClass = "rounded-xl bg-accent/10 px-4 py-3 text-sm";

/** 카드 안에 들어가는 작은 버튼 */
export const smallButtonClass = "rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white";
export const smallSecondaryButtonClass = "rounded-lg border border-foreground/15 px-3 py-1.5 text-sm";
