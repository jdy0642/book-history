import Link from "next/link";

/** "← 제목" 헤더 (탭 바가 없는 화면용). 오른쪽에 버튼 등을 둘 수 있다 */
export function BackHeader({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href={href} className="text-muted" aria-label="뒤로">
          ←
        </Link>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      {children}
    </header>
  );
}
