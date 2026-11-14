import { BottomNav } from "@/components/bottom-nav";

/** 아래쪽 탭(홈·달력·책장)이 있는 화면들 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-20">{children}</div>
      <BottomNav />
    </>
  );
}
