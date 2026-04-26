import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, type Profile } from "@/lib/supabase";
import { getActiveBan, type ActiveBan } from "@/lib/bans";
import { BanDialog } from "@/components/BanDialog";

type AuthCtx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ban, setBan] = useState<ActiveBan | null>(null);
  const [banOpen, setBanOpen] = useState(false);

  const loadProfile = async (uid: string) => {
    // Ban check first — if banned, force sign-out and show dialog.
    const activeBan = await getActiveBan(uid);
    if (activeBan) {
      setBan(activeBan);
      setBanOpen(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    setProfile((prof as Profile) ?? null);

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    setIsAdmin(role?.role === "admin");
  };

  useEffect(() => {
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfile(session.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Periodically re-check ban status so a moderator action takes effect
    // for already-signed-in users within ~60s without requiring a refresh.
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const activeBan = await getActiveBan(session.user.id);
      if (activeBan) {
        setBan(activeBan);
        setBanOpen(true);
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
    }, 60_000);

    return () => {
      sub.subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <Ctx.Provider value={{ user, profile, loading, isAdmin, signOut, refreshProfile }}>
      {children}
      <BanDialog ban={ban} open={banOpen} onClose={() => setBanOpen(false)} />
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}