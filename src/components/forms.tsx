// 서버 컴포넌트에서 쓰는 작은 폼 버튼들 (서버 액션을 직접 받는다)
import { logout } from "@/app/login/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="text-sm text-muted">
        로그아웃
      </button>
    </form>
  );
}

/** hidden id 를 실어 서버 액션을 부르는 "삭제" 버튼 */
export function DeleteButton({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="px-2 text-sm text-muted" aria-label={label}>
        삭제
      </button>
    </form>
  );
}
