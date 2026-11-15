import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { APP_NAME, OPERATOR } from "@/lib/brand";

export const metadata = { title: "이용약관" };

export default function TermsPage() {
  return (
    <LegalPage title="이용약관">
      <section>
        <h2>1. 목적</h2>
        <p>
          이 약관은 {APP_NAME}(이하 &quot;서비스&quot;)를 쓰는 데 필요한 운영자({OPERATOR.name})와 이용자 사이의
          약속을 정합니다.
        </p>
      </section>

      <section>
        <h2>2. 가입</h2>
        <ul>
          <li>만 14세 이상이면 이메일로 가입할 수 있습니다.</li>
          <li>가입하면 이 약관과 <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의한 것으로 봅니다.</li>
          <li>한 계정은 한 가족에만 속할 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h2>3. 서비스 내용</h2>
        <p>
          아이에게 읽어준 책을 기록하고, 달력·책장·통계로 보고, 가족과 함께 기록하는 기능을 무료로 제공합니다. 서비스는
          시험 운영(베타) 중이며, 기능이 바뀌거나 추가될 수 있습니다.
        </p>
      </section>

      <section>
        <h2>4. 가족 공유</h2>
        <ul>
          <li>같은 가족 구성원은 가족의 아이 정보와 모든 읽기 기록을 함께 보고, 고치고, 지울 수 있습니다.</li>
          <li>초대 링크를 가진 사람은 누구나 가족에 들어올 수 있으니, 믿을 수 있는 사람에게만 보내 주세요.</li>
        </ul>
      </section>

      <section>
        <h2>5. 이용자가 지킬 것</h2>
        <ul>
          <li>다른 사람의 계정을 쓰거나, 다른 사람의 정보를 허락 없이 입력하지 않습니다.</li>
          <li>서비스를 방해하거나 정상적이지 않은 방법으로 접근하지 않습니다.</li>
          <li>메모 등에 법령에 어긋나는 내용을 쓰지 않습니다.</li>
        </ul>
      </section>

      <section>
        <h2>6. 서비스 변경·중단</h2>
        <p>
          운영자는 서비스를 바꾸거나 중단할 수 있습니다. 서비스를 끝낼 때는 최소 30일 전에 알리고, 그동안 기록을
          CSV로 내려받을 수 있게 합니다.
        </p>
      </section>

      <section>
        <h2>7. 책임</h2>
        <ul>
          <li>운영자는 기록이 안전하게 보관되도록 노력하지만, 무료 서비스 특성상 천재지변·외부 업체 장애 등으로 생긴 손해는 책임지지 않습니다. 중요한 기록은 CSV로 따로 보관해 주세요.</li>
          <li>책 정보(제목·표지 등)는 카카오 책 검색에서 가져오며, 정확하지 않을 수 있습니다.</li>
          <li>운영자의 고의나 중대한 과실로 생긴 손해는 법령에 따라 책임집니다.</li>
        </ul>
      </section>

      <section>
        <h2>8. 탈퇴</h2>
        <p>
          가족 관리 화면에서 언제든 탈퇴할 수 있습니다. 탈퇴할 때 정보가 어떻게 처리되는지는 개인정보처리방침에
          적혀 있습니다. 이 약관을 심하게 어긴 계정은 운영자가 이용을 제한할 수 있습니다.
        </p>
      </section>

      <section>
        <h2>9. 약관 변경</h2>
        <p>약관이 바뀌면 시행 7일 전에 서비스 안에서 알립니다. 바뀐 약관에 동의하지 않으면 탈퇴할 수 있습니다.</p>
      </section>

      <section>
        <h2>10. 문의</h2>
        <p>이메일: {OPERATOR.email}</p>
      </section>
    </LegalPage>
  );
}
