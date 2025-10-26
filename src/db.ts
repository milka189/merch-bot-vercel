import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL as string;
const service = process.env.SUPABASE_SERVICE_ROLE;
const anon = process.env.SUPABASE_ANON_KEY;

if (!url || (!service && !anon)) {
  throw new Error("Missing SUPABASE_URL or SUPABASE keys");
}

export const sb: SupabaseClient = createClient(url, service || (anon as string), {
  auth: { persistSession: false }
});

export async function getPeriodStart(): Promise<Date> {
  const { data, error } = await sb.from("settings").select("*").eq("key", "period_start").single();
  if (error) throw error;
  const v = (data as any).value as string;
  return new Date(v + "T00:00:00Z");
}

export function weekOfPeriod(now: Date, start: Date): number {
  const ms = now.getTime() - start.getTime();
  const days = Math.floor(ms / 86400000);
  const w = Math.floor((days >= 0 ? days : (days - 6)) / 7) % 4;
  const week = ((w + 4) % 4) + 1;
  return week;
}
