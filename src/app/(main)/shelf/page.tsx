import Link from "next/link";
import { emptyStateClass, segmentClass, segmentedClass } from "@/components/styles";
import { requireFamily } from "@/lib/auth";
import { formatDateKo } from "@/lib/date";
import { getShelf } from "@/lib/logs";

export const metadata = { title: "책장" };

type Sort = "count" | "recent";

export default async function ShelfPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const sort: Sort = (await searchParams).sort === "recent" ? "recent" : "count";

  const { data: shelf } = await requireFamily(getShelf);

  const books = [...shelf].sort((a, b) =>
    sort === "count"
      ? b.count - a.count || b.lastRead.localeCompare(a.lastRead)
      : b.lastRead.localeCompare(a.lastRead) || b.count - a.count,
  );
  const totalReads = shelf.reduce((sum, b) => sum + b.count, 0);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold">우리 집 책장</h1>
        <p className="text-sm text-muted">
          책 {shelf.length}종 · 모두 {totalReads}번 읽었어요
        </p>
      </header>

      <div role="tablist" className={segmentedClass}>
        {(
          [
            ["count", "많이 읽은 순"],
            ["recent", "최근 읽은 순"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={`/shelf?sort=${value}`}
            role="tab"
            aria-selected={sort === value}
            className={segmentClass(sort === value)}
          >
            {label}
          </Link>
        ))}
      </div>

      {books.length === 0 ? (
        <p className={emptyStateClass}>
          아직 읽은 책이 없어요. 홈에서 첫 기록을 남겨 보세요.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-3">
          {books.map((book, i) => (
            <li key={book.id} className="flex flex-col gap-1">
              <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-accent/10 p-2 text-center text-sm font-medium">
                {book.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 외부 표지 이미지 (카카오 검색 연동 후)
                  <img src={book.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="line-clamp-4">{book.title}</span>
                )}
                {sort === "count" && i < 3 && (
                  <span className="absolute left-1 top-1 rounded bg-accent px-1.5 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                )}
              </div>
              <p className="truncate text-sm font-medium">{book.title}</p>
              <p className="text-xs text-muted">
                {book.count}번 · {formatDateKo(book.lastRead)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
