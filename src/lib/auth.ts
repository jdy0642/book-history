import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type Child = { id: string; nickname: string; birth_month: string | null };
type Family = { id: string; name: string; children: Child[] };

/** 현재 로그인한 사용자 (없으면 null) */
export async function getUser() {
  if (!isSupabaseConfigured) {
    throw new Error(".env.local 에 Supabase URL / 키가 없어요.");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** 로그인한 사용자만 통과. 아니면 /login 으로 보낸다. */
export async function requireUser() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * 내가 속한 가족 + 아이 목록을 한 번에 조회 (RLS 덕분에 내 가족만 보인다).
 * 아직 가족이 없으면 null
 */
export async function getMyFamily(supabase: SupabaseClient): Promise<Family | null> {
  const { data, error } = await supabase
    .from("families")
    .select("id, name, children(id, nickname, birth_month)")
    .order("created_at")
    .order("created_at", { referencedTable: "children" })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** 가족이 있는 사용자만 통과. 아니면 /onboarding 으로 보낸다. */
export async function requireFamily() {
  const { supabase, user } = await requireUser();
  const family = await getMyFamily(supabase);
  if (!family) redirect("/onboarding");
  return { supabase, user, family };
}

export async function getDisplayName(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  return (data?.display_name as string | undefined) ?? "보호자";
}
