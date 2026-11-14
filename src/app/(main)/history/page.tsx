import Link from "next/link";
import { LogItem } from "@/components/log-item";
import { emptyStateClass } from "@/components/styles";
import { requireFamily } from "@/lib/auth";
import {
  WEEKDAYS,
  addMonths,
  formatDateKo,
  formatMonthKo,
  isDateString,
  isMonthString,
  monthDays,
  todayKST,
} from "@/lib/date";
import { getFamilyNames, getLogsBetween } from "@/lib/logs";

export const metadata = { title: "달력" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const params = await searchParams;
  const today = todayKST();
  const thisMonth = today.slice(0, 7);
  const month = isMonthString(params.month) ? params.month : thisMonth;
  const { days, firstWeekday } = monthDays(month);

  // 선택한 날: 주소의 date → (이번 달이면) 오늘 → 없음
  let selected: string | undefined = today.startsWith(month) ? today : undefined;
  if (isDateString(params.date) && params.date.startsWith(month)) selected = params.date;

  const {
    family,
    data: [logs, names],
  } = await requireFamily((supabase) =>
    Promise.all([getLogsBetween(supabase, days[0], days[days.length - 1]), getFamilyNames(supabase)]),
  );

  const countByDay = new Map<string, number>();
  for (const log of logs) countByDay.set(log.read_on, (countByDay.get(log.read_on) ?? 0) + 1);
  const selectedLogs = logs.filter((log) => log.read_on === selected);
  const nextMonth = addMonths(month, 1);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <MonthLink month={addMonths(month, -1)} label="이전 달" symbol="‹" />
        <div className="text-center">
          <h1 className="text-xl font-bold">{formatMonthKo(month)}</h1>
          <p className="text-sm text-muted">이 달에 {logs.length}권 읽었어요</p>
        </div>
        <MonthLink month={nextMonth} label="다음 달" symbol="›" disabled={nextMonth > thisMonth} />
      </header>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`py-1 text-xs ${i === 0 ? "text-red-500" : "text-muted"}`}>
            {w}
          </div>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const count = countByDay.get(day) ?? 0;
          const isToday = day === today;
          const isSelected = day === selected;
          const content = (
            <>
              <span className={isToday ? "font-bold text-accent" : ""}>{Number(day.slice(8))}</span>
              <span className={`text-[10px] leading-none ${count ? "font-semibold text-accent" : "text-transparent"}`}>
                {count ? `${count}권` : "·"}
              </span>
            </>
          );
          const base = "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm";

          // 미래 날짜는 누를 수 없다
          if (day > today) {
            return (
              <div key={day} className={`${base} text-muted/40`}>
                {content}
              </div>
            );
          }
          return (
            <Link
              key={day}
              href={`/history?month=${month}&date=${day}`}
              aria-label={`${formatDateKo(day)} ${count}권`}
              aria-current={isSelected ? "date" : undefined}
              className={[base, count && "bg-accent/10", isSelected && "ring-2 ring-accent"].filter(Boolean).join(" ")}
            >
              {content}
            </Link>
          );
        })}
      </div>

      {selected && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">
            {formatDateKo(selected)} <span className="text-accent">{selectedLogs.length}권</span>
          </h2>
          {selectedLogs.length === 0 ? (
            <p className={emptyStateClass}>이 날은 기록이 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedLogs.map((log) => (
                <LogItem key={log.id} log={log} familyChildren={family.children} readerNames={names} />
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

function MonthLink({
  month,
  label,
  symbol,
  disabled,
}: {
  month: string;
  label: string;
  symbol: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="px-3 py-1 text-muted/30" aria-hidden>
        {symbol}
      </span>
    );
  }
  return (
    <Link href={`/history?month=${month}`} className="px-3 py-1 text-muted" aria-label={label}>
      {symbol}
    </Link>
  );
}
