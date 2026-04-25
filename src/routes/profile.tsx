import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Mingle" },
      { name: "description", content: "Manage your Mingle profile." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (profile) setUsername(profile.username);
  }, [user, loading, profile, navigate]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: username.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); refreshProfile(); }
  };

  return (
    <div>
      <Nav />
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <h1 className="display text-4xl font-black mb-8">Your profile</h1>
        <div className="rounded-3xl bg-card/60 border border-border/60 p-8 space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div>
            <Label htmlFor="u">Username</Label>
            <Input id="u" value={username} onChange={e => setUsername(e.target.value)} minLength={3} />
          </div>
          <Button onClick={save} disabled={saving} className="bg-gradient-brand text-background hover:opacity-90 font-bold rounded-xl">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}