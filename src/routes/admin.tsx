import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Mingle" }, { name: "description", content: "Mingle admin panel." }],
  }),
  component: AdminPage,
});

type Report = {
  id: string; reporter_id: string; reported_user_id: string;
  reason: string; custom_reason: string | null; reviewed: boolean; created_at: string;
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/auth" });
      else if (!isAdmin) navigate({ to: "/" });
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setReports((data as Report[]) ?? []));
  }, [isAdmin]);

  const banUser = async (uid: string, permanent = false) => {
    if (!user) return;
    setBusy(uid);
    const { error } = await supabase.from("bans").insert({
      user_id: uid,
      reason: "Admin action via report",
      is_permanent: permanent,
      expires_at: permanent ? null : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      created_by: user.id,
    });
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("User banned");
  };

  const markReviewed = async (id: string) => {
    await supabase.from("reports").update({ reviewed: true }).eq("id", id);
    setReports(rs => rs.map(r => r.id === id ? { ...r, reviewed: true } : r));
  };

  if (!isAdmin) return null;

  return (
    <div>
      <Nav />
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="display text-4xl font-black mb-8">Reports</h1>
        <div className="rounded-3xl border border-border/60 bg-card/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left bg-muted/30">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Reported user</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr><td className="p-6 text-muted-foreground" colSpan={5}>No reports yet.</td></tr>
              )}
              {reports.map(r => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-3 whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs">{r.reported_user_id.slice(0, 8)}…</td>
                  <td className="p-3"><div className="font-medium">{r.reason}</div>{r.custom_reason && <div className="text-xs text-muted-foreground">{r.custom_reason}</div>}</td>
                  <td className="p-3">{r.reviewed ? <span className="text-green-400">Reviewed</span> : <span className="text-yellow-400">Open</span>}</td>
                  <td className="p-3 space-x-2">
                    <Button size="sm" variant="outline" disabled={busy === r.reported_user_id} onClick={() => banUser(r.reported_user_id, false)}>7d ban</Button>
                    <Button size="sm" variant="destructive" disabled={busy === r.reported_user_id} onClick={() => banUser(r.reported_user_id, true)}>Permaban</Button>
                    {!r.reviewed && <Button size="sm" variant="ghost" onClick={() => markReviewed(r.id)}>Mark reviewed</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}