export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** .env.local 에 Supabase 값이 들어 있는지 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
