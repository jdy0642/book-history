import { renderAppIcon } from "@/lib/app-icon";

// 홈 화면 설치용 아이콘 (매니페스트가 참조). 빌드할 때 한 번만 만든다.
const VARIANTS = {
  "512": () => renderAppIcon(512, { rounded: true }),
  maskable: () => renderAppIcon(512, { safeZone: 0.5 }), // 안드로이드가 원·둥근 사각형으로 잘라도 책이 보이게
};

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  return VARIANTS[variant as keyof typeof VARIANTS]();
}
