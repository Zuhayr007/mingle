import { supabase } from "./supabase";

export type ActiveBan = {
  id: string;
  reason: string;
  is_permanent: boolean;
  expires_at: string | null;
  created_at: string;
};

/**
 * Returns the most relevant active ban for a user, or null if none.
 * Permanent bans take precedence; otherwise the latest-expiring one wins.
 */
export async function getActiveBan(userId: string): Promise<ActiveBan | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("bans")
    .select("id, reason, is_permanent, expires_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return null;
  const active = (data as ActiveBan[]).filter(
    (b) => b.is_permanent || (b.expires_at && b.expires_at > nowIso),
  );
  if (active.length === 0) return null;
  const perm = active.find((b) => b.is_permanent);
  if (perm) return perm;
  return active.sort((a, b) => (b.expires_at ?? "").localeCompare(a.expires_at ?? ""))[0];
}

export function formatRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / (60 * 24));
  const hours = Math.floor((mins % (60 * 24)) / 60);
  const minutes = mins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Detailed countdown breakdown for live ticking displays.
 * Returns null once the ban has expired.
 */
export function getCountdownParts(expiresAt: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} | null {
  const totalMs = new Date(expiresAt).getTime() - Date.now();
  if (totalMs <= 0) return null;
  const totalSec = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, totalMs };
}
