import { BackHeader } from "@/components/back-header";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/brand";

/** 개인정보처리방침·이용약관 공통 틀 (로그인하지 않아도 볼 수 있다) */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6">
      <BackHeader href="/" title={title} />
      <div className="flex flex-col gap-6 text-sm leading-relaxed [&_:is(td,th)]:border [&_:is(td,th)]:border-foreground/10 [&_:is(td,th)]:p-2 [&_:is(td,th)]:text-left [&_:is(td,th)]:align-top [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:mt-1 [&_table]:w-full [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
      <p className="text-sm text-muted">시행일: {LEGAL_EFFECTIVE_DATE}</p>
    </main>
  );
}
