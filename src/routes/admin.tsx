import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ShieldAlert, Ban, Clock, CheckCircle2 } from "lucide-react";

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

type BanRow = {
  id: string;
  user_id: string;
  reason: string;
  is_permanent: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
};

type UsernameMap = Record<string, string>;

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [bans, setBans] = useState<BanRow[]>([]);
  const [usernames, setUsernames] = useState<UsernameMap>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"reports" | "bans">("reports");

  // Ban dialog state
  const [banDialog, setBanDialog] = useState<{ open: boolean; userId: string | null; fromReportId: string | null }>({
    open: false, userId: null, fromReportId: null,
  });
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<"1" | "7" | "30" | "permanent" | "custom">("7");
  const [customDays, setCustomDays] = useState("3");

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/auth" });
      else if (!isAdmin) navigate({ to: "/" });
    }
  }, [user, isAdmin, loading, navigate]);

  const loadAll = async () => {
    const [{ data: rep }, { data: bn }] = await Promise.all([
      supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("bans").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const reportsData = (rep as Report[]) ?? [];
    const bansData = (bn as BanRow[]) ?? [];
    setReports(reportsData);
    setBans(bansData);

    const ids = new Set<string>();
    reportsData.forEach(r => { ids.add(r.reporter_id); ids.add(r.reported_user_id); });
    bansData.forEach(b => { ids.add(b.user_id); if (b.created_by) ids.add(b.created_by); });
    if (ids.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", Array.from(ids));
      const map: UsernameMap = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.username; });
      setUsernames(map);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
  }, [isAdmin]);

  const openBanDialog = (uid: string, fromReportId: string | null = null) => {
    setBanReason("Violation of community guidelines");
    setBanDuration("7");
    setCustomDays("3");
    setBanDialog({ open: true, userId: uid, fromReportId });
  };

  const submitBan = async () => {
    if (!user || !banDialog.userId) return;
    setBusy(banDialog.userId);
    let expires_at: string | null = null;
    let is_permanent = false;
    if (banDuration === "permanent") {
      is_permanent = true;
    } else {
      const days = banDuration === "custom" ? Math.max(1, parseInt(customDays || "1", 10)) : parseInt(banDuration, 10);
      expires_at = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
    }
    const { error } = await supabase.from("bans").insert({
      user_id: banDialog.userId,
      reason: banReason.trim() || "Violation of community guidelines",
      is_permanent,
      expires_at,
      created_by: user.id,
    });
    if (error) {
      toast.error(error.message);
      setBusy(null);
      return;
    }
    if (banDialog.fromReportId) {
      await supabase.from("reports").update({ reviewed: true }).eq("id", banDialog.fromReportId);
    }
    toast.success(is_permanent ? "User permanently banned" : "User banned");
    setBanDialog({ open: false, userId: null, fromReportId: null });
    setBusy(null);
    loadAll();
  };

  const liftBan = async (id: string) => {
    const { error } = await supabase.from("bans").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Ban lifted"); setBans(bs => bs.filter(b => b.id !== id)); }
  };

  const markReviewed = async (id: string) => {
    await supabase.from("reports").update({ reviewed: true }).eq("id", id);
    setReports(rs => rs.map(r => r.id === id ? { ...r, reviewed: true } : r));
  };

  if (!isAdmin) return null;

  const isActive = (b: BanRow) => b.is_permanent || (b.expires_at && new Date(b.expires_at) > new Date());
  const activeBans = bans.filter(isActive);
  const openReports = reports.filter(r => !r.reviewed);
  const userLabel = (id: string) => usernames[id] ?? `${id.slice(0, 8)}…`;

  return (
    <div>
      <Nav />
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-7 h-7 text-(--brand-pink)]" />
          <h1 className="display text-4xl font-black">Moderation</h1>
        </div>
        <p className="text-muted-foreground mb-8">Review reports, ban abusers, manage active bans.</p>

        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
            <div className="text-xs text-muted-foreground">Open reports</div>
            <div className="text-3xl font-black">{openReports.length}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
            <div className="text-xs text-muted-foreground">Active bans</div>
            <div className="text-3xl font-black">{activeBans.length}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
            <div className="text-xs text-muted-foreground">Total reports</div>
            <div className="text-3xl font-black">{reports.length}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button variant={tab === "reports" ? "default" : "outline"} onClick={() => setTab("reports")} className="rounded-xl">Reports</Button>
          <Button variant={tab === "bans" ? "default" : "outline"} onClick={() => setTab("bans")} className="rounded-xl">Bans</Button>
        </div>

        {tab === "reports" && (
        <div className="rounded-3xl border border-border/60 bg-card/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left bg-muted/30">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Reporter</th>
                <th className="p-3">Reported user</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr><td className="p-6 text-muted-foreground" colSpan={6}>No reports yet.</td></tr>
              )}
              {reports.map(r => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-3 whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3">{userLabel(r.reporter_id)}</td>
                  <td className="p-3 font-semibold">{userLabel(r.reported_user_id)}</td>
                  <td className="p-3"><div className="font-medium">{r.reason}</div>{r.custom_reason && <div className="text-xs text-muted-foreground">{r.custom_reason}</div>}</td>
                  <td className="p-3">{r.reviewed ? <span className="text-green-400">Reviewed</span> : <span className="text-yellow-400">Open</span>}</td>
                  <td className="p-3 space-x-2">
                    <Button size="sm" variant="destructive" disabled={busy === r.reported_user_id} onClick={() => openBanDialog(r.reported_user_id, r.id)}>
                      <Ban className="w-3 h-3" /> Ban
                    </Button>
                    {!r.reviewed && <Button size="sm" variant="ghost" onClick={() => markReviewed(r.id)}>Mark reviewed</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {tab === "bans" && (
          <div className="rounded-3xl border border-border/60 bg-card/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left bg-muted/30">
                <tr>
                  <th className="p-3">When</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bans.length === 0 && (
                  <tr><td className="p-6 text-muted-foreground" colSpan={6}>No bans yet.</td></tr>
                )}
                {bans.map(b => {
                  const active = isActive(b);
                  return (
                    <tr key={b.id} className="border-t border-border/50">
                      <td className="p-3 whitespace-nowrap text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                      <td className="p-3 font-semibold">{userLabel(b.user_id)}</td>
                      <td className="p-3">{b.reason}</td>
                      <td className="p-3">
                        {b.is_permanent
                          ? <span className="inline-flex items-center gap-1 text-red-400"><Ban className="w-3 h-3" /> Permanent</span>
                          : <span className="inline-flex items-center gap-1 text-yellow-400"><Clock className="w-3 h-3" /> Until {b.expires_at ? new Date(b.expires_at).toLocaleString() : "—"}</span>}
                      </td>
                      <td className="p-3">
                        {active
                          ? <span className="text-red-400 font-semibold">Active</span>
                          : <span className="inline-flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3 h-3" /> Expired</span>}
                      </td>
                      <td className="p-3">
                        {active && <Button size="sm" variant="outline" onClick={() => liftBan(b.id)}>Lift</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={banDialog.open} onOpenChange={(o) => !o && setBanDialog({ open: false, userId: null, fromReportId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban user</DialogTitle>
            <DialogDescription>
              Banning <span className="font-semibold">{banDialog.userId ? userLabel(banDialog.userId) : ""}</span>. They'll see this reason next time they sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Reason (shown to user)</label>
              <Textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g. Harassment of other users" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Duration</label>
              <div className="grid grid-cols-5 gap-2">
                {([
                  ["1", "1 day"],
                  ["7", "7 days"],
                  ["30", "30 days"],
                  ["custom", "Custom"],
                  ["permanent", "Permanent"],
                ] as const).map(([val, label]) => (
                  <Button
                    key={val}
                    type="button"
                    variant={banDuration === val ? "default" : "outline"}
                    onClick={() => setBanDuration(val)}
                    className="rounded-xl text-xs h-10"
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {banDuration === "custom" && (
                <div className="mt-2 flex items-center gap-2">
                  <Input type="number" min={1} value={customDays} onChange={e => setCustomDays(e.target.value)} className="w-24" />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanDialog({ open: false, userId: null, fromReportId: null })}>Cancel</Button>
            <Button variant="destructive" disabled={busy === banDialog.userId} onClick={submitBan}>
              <Ban className="w-4 h-4" /> Confirm ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}