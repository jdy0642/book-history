"use client";

import { useActionState, useEffect, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui";
import { cardClass, inputClass, optionCardClass } from "@/components/styles";
import type { Child } from "@/lib/auth";
import type { FormState } from "@/lib/form";
import type { PickedBook } from "@/lib/kakao";
import type { Book, ReadingLog } from "@/lib/logs";
import { REACTIONS } from "@/lib/reactions";
import { createLog, updateLog } from "./actions";

const chipClass =
  "cursor-pointer rounded-full border border-foreground/15 px-4 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:font-semibold";

function parsePicked(raw: string | undefined): PickedBook | null {
  try {
    return raw ? (JSON.parse(raw) as PickedBook) : null;
  } catch {
    return null;
  }
}

/** 새 기록: 책 고르기(검색 / 최근 책 / 직접 입력) + 공통 항목 */
export function LogForm({
  recentBooks,
  familyChildren,
  today,
}: {
  recentBooks: Book[];
  familyChildren: Child[];
  today: string;
}) {
  const [state, action] = useActionState(createLog, undefined);
  const values = state?.values;

  // 에러로 돌아오면 직전에 고른 책을 유지, 처음엔 최근 책이 있으면 첫 번째 책, 없으면 검색부터.
  //
  // 책 라디오는 controlled(checked) 로 두지 않는다. React 19 는 폼 액션이 끝나면 폼을 초기화하는데,
  // controlled 라디오는 "처음 그려질 때 선택된 책"으로 돌아가고 상태는 그대로라 다른 책이 저장될 수 있다.
  // 대신 defaultChecked(초기화 기준값)와 ref(그릴 때마다 화면 선택을 bookId 에 맞춤)를 함께 쓴다.
  const [bookId, setBookId] = useState(values?.book_id || recentBooks[0]?.id || "search");
  // 검색해서 고른 책 (서버는 ISBN·제목으로 카카오에 다시 조회해서 저장한다)
  const [picked, setPicked] = useState<PickedBook | null>(() => parsePicked(values?.kakao_book));

  const radioProps = (value: string) => ({
    type: "radio" as const,
    name: "book_id",
    value,
    defaultChecked: bookId === value,
    ref: (el: HTMLInputElement | null) => {
      if (el) el.checked = bookId === value;
    },
    onChange: () => setBookId(value),
    className: "accent-accent",
  });

  function pick(book: PickedBook) {
    setPicked(book);
    setBookId("kakao");
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">책</legend>

        <BookSearch onPick={pick} autoFocus={recentBooks.length === 0} />

        {picked && (
          <label className={optionCardClass}>
            <input {...radioProps("kakao")} />
            <Cover url={picked.cover_url} />
            <BookTitle book={picked} />
            <input type="hidden" name="kakao_book" value={JSON.stringify(picked)} />
          </label>
        )}

        {recentBooks.length > 0 && <p className="pt-2 text-sm text-muted">최근 읽은 책</p>}
        {recentBooks.map((book) => (
          <label key={book.id} className={optionCardClass}>
            <input {...radioProps(book.id)} />
            <Cover url={book.cover_url} />
            <BookTitle book={book} />
          </label>
        ))}

        <label className={optionCardClass}>
          <input {...radioProps("new")} />
          <span className="font-medium">+ 검색에 없는 책 직접 입력</span>
        </label>

        {bookId === "new" && (
          <div className="flex flex-col gap-2 pt-1">
            <input
              name="title"
              required
              maxLength={300}
              placeholder="책 제목"
              defaultValue={values?.title}
              className={inputClass}
              autoFocus
            />
            <input
              name="authors"
              placeholder="지은이 (선택, 여러 명은 쉼표로)"
              defaultValue={values?.authors}
              className={inputClass}
            />
          </div>
        )}
      </fieldset>

      <DetailFields familyChildren={familyChildren} today={today} values={values} />
      <FormMessage {...state} />
      <SubmitButton pendingText="기록 중…">기록하기</SubmitButton>
    </form>
  );
}

/** 제목으로 카카오 책 검색 (입력을 멈추고 0.3초 뒤 검색) */
function BookSearch({ onPick, autoFocus }: { onPick: (book: PickedBook) => void; autoFocus: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedBook[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const q = query.trim();

  useEffect(() => {
    if (!q) return; // 검색어가 없으면 아무것도 보여주지 않는다 (아래 렌더링에서 q 로 가린다)
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error();
        setResults(((await res.json()) as { books: PickedBook[] }).books);
        setStatus("done");
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} // 검색창에서 엔터로 기록이 저장되지 않게
        placeholder="🔍 책 제목으로 검색"
        aria-label="책 제목으로 검색"
        className={inputClass}
        autoFocus={autoFocus}
      />
      {q && status === "loading" && <p className="text-sm text-muted">검색 중…</p>}
      {q && status === "error" && <FormMessage error="검색에 실패했어요. 잠시 후 다시 시도해 주세요." />}
      {q && status === "done" && results.length === 0 && (
        <p className="text-sm text-muted">검색 결과가 없어요. 아래에서 직접 입력할 수 있어요.</p>
      )}
      {q && results.length > 0 && (
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-xl border border-foreground/10 p-1">
          {results.map((book) => (
            <li key={book.isbn}>
              <button
                type="button"
                onClick={() => {
                  onPick(book);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent/10"
              >
                <Cover url={book.cover_url} />
                <BookTitle book={book} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 작은 표지 (없으면 빈 칸) */
function Cover({ url }: { url: string | null }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- 카카오 썸네일 (외부 이미지)
    <img src={url} alt="" className="h-12 w-9 shrink-0 rounded object-cover" loading="lazy" />
  ) : (
    <span className="h-12 w-9 shrink-0 rounded bg-accent/10" aria-hidden />
  );
}

/** 기록 수정: 책은 그대로, 날짜·아이·반응·메모만 */
export function EditLogForm({
  log,
  familyChildren,
  today,
}: {
  log: ReadingLog;
  familyChildren: Child[];
  today: string;
}) {
  const [state, action] = useActionState(updateLog, undefined);
  const values = state?.values ?? {
    read_on: log.read_on,
    reaction: log.reaction ?? "",
    memo: log.memo ?? "",
    child_ids: log.child_ids.join(","),
  };

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={log.id} />
      <div className={cardClass}>
        <BookTitle book={log.book} />
      </div>
      <DetailFields familyChildren={familyChildren} today={today} values={values} />
      <FormMessage {...state} />
      <SubmitButton pendingText="저장 중…">저장하기</SubmitButton>
    </form>
  );
}

function BookTitle({ book }: { book: Pick<Book, "title" | "authors"> }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-medium">{book.title}</span>
      {book.authors.length > 0 && (
        <span className="block truncate text-sm text-muted">{book.authors.join(", ")}</span>
      )}
    </span>
  );
}

/** 아이·날짜·반응·메모 (추가·수정 공통) */
function DetailFields({
  familyChildren,
  today,
  values,
}: {
  familyChildren: Child[];
  today: string;
  values: NonNullable<FormState>["values"];
}) {
  const selectedChildren = values?.child_ids?.split(",");

  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">누구에게 읽어줬나요?</legend>
        <div className="flex flex-wrap gap-2">
          {familyChildren.map((child) => (
            <label key={child.id} className={chipClass}>
              <input
                type="checkbox"
                name="child_ids"
                value={child.id}
                defaultChecked={selectedChildren ? selectedChildren.includes(child.id) : true}
                className="sr-only"
              />
              {child.nickname}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-semibold">읽은 날</span>
        <input
          name="read_on"
          type="date"
          required
          max={today}
          defaultValue={values?.read_on || today}
          className={inputClass}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">
          아이 반응 <span className="text-sm font-normal text-muted">(선택)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          <label className={chipClass}>
            <input type="radio" name="reaction" value="" defaultChecked={!values?.reaction} className="sr-only" />
            선택 안 함
          </label>
          {Object.entries(REACTIONS).map(([value, emoji]) => (
            <label key={value} className={`${chipClass} text-lg`}>
              <input
                type="radio"
                name="reaction"
                value={value}
                defaultChecked={values?.reaction === value}
                className="sr-only"
              />
              {emoji}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-semibold">
          메모 <span className="text-sm font-normal text-muted">(선택)</span>
        </span>
        <textarea
          name="memo"
          maxLength={500}
          rows={3}
          placeholder="예: 세 번이나 다시 읽어달라고 했어요"
          defaultValue={values?.memo}
          className={inputClass}
        />
      </label>
    </>
  );
}
