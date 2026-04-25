import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon || url.includes("your-project")) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Mingle] Supabase env vars missing. Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(url || "https://placeholder.supabase.co", anon || "placeholder", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Session = {
  id: string;
  user_a: string;
  user_b: string | null;
  status: "waiting" | "active" | "ended";
  created_at: string;
  ended_at: string | null;
};