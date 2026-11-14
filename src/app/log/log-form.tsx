"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui";
import { cardClass, inputClass, optionCardClass } from "@/components/styles";
import type { Child } from "@/lib/auth";
import type { FormState } from "@/lib/form";
import type { Book, ReadingLog } from "@/lib/logs";
import { REACTIONS } from "@/lib/reactions";
import { createLog, updateLog } from "./actions";

const chipClass =
  "cursor-pointer rounded-full border border-foreground/15 px-4 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:font-semibold";

/** 새 기록: 책 고르기(최근 책 / 직접 입력) + 공통 항목 */
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

  // 에러로 돌아오면 직전에 고른 책을 유지, 처음엔 최근 책이 있으면 첫 번째 책
  const [bookId, setBookId] = useState(values?.book_id || recentBooks[0]?.id || "new");

  return (
    <form action={action} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">책</legend>
        {recentBooks.map((book) => (
          <label key={book.id} className={optionCardClass}>
            <input
              type="radio"
              name="book_id"
              value={book.id}
              checked={bookId === book.id}
              onChange={() => setBookId(book.id)}
              className="accent-accent"
            />
            <BookTitle book={book} />
          </label>
        ))}
        <label className={optionCardClass}>
          <input
            type="radio"
            name="book_id"
            value="new"
            checked={bookId === "new"}
            onChange={() => setBookId("new")}
            className="accent-accent"
          />
          <span className="font-medium">+ 새 책 직접 입력</span>
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
              autoFocus={recentBooks.length > 0}
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

function BookTitle({ book }: { book: Book }) {
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
