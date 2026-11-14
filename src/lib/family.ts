import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type Member = { user_id: string; role: "owner" | "member" };
type Invite = { id: string; token: string; expires_at: string };
type InvitePreview = { family_name: string; inviter_name: string | null; expired: boolean };

// RLS 로 내 가족의 구성원·초대만 조회된다 (한 계정은 한 가족에만 속하므로 family_id 조건이 필요 없다).
// 그래서 가족 조회와 동시에 실행할 수 있다.

export async function getMembers(supabase: SupabaseClient): Promise<Member[]> {
  const { data, error } = await supabase.from("family_members").select("user_id, role").order("joined_at");
  if (error) throw error;
  return data ?? [];
}

/** 아직 만료되지 않은 초대 링크 */
export async function getActiveInvites(supabase: SupabaseClient): Promise<Invite[]> {
  const { data, error } = await supabase
    .from("family_invites")
    .select("id, token, expires_at")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** 초대 링크를 연 사람에게 보여줄 정보 (가입 전에도 볼 수 있다). 없는 토큰이면 null */
export async function getInvitePreview(supabase: SupabaseClient, token: string): Promise<InvitePreview | null> {
  const { data } = await supabase.rpc("get_invite_preview", { invite_token: token });
  return (data as InvitePreview[] | null)?.[0] ?? null;
}
