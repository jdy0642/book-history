/**
 * 책 바코드(EAN-13)의 ISBN 인지 확인한다. 하이픈·공백은 무시하고, 맞으면 13자리 숫자를 돌려준다.
 * 책 ISBN 은 978·979 로 시작하고 마지막 자리는 검증 숫자다 (잘못 읽힌 바코드를 거른다).
 */
export function toIsbn13(raw: string): string | null {
  const digits = raw.replace(/[-\s]/g, "");
  if (!/^97[89]\d{10}$/.test(digits)) return null;
  const sum = [...digits].reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return sum % 10 === 0 ? digits : null;
}
