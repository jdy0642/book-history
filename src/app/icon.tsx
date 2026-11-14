import { renderAppIcon } from "@/lib/app-icon";

// 브라우저 탭 아이콘 (/icon). 홈 화면 설치용 큰 아이콘은 /icons/[variant] (매니페스트에서만 참조)
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return renderAppIcon(192, { rounded: true });
}
