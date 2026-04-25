import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in to Mingle" },
      { name: "description", content: "Sign in or create your free Mingle account to start meeting strangers." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    setTimeout(() => navigate({ to: "/chat" }), 0);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (username.trim().length < 3) throw new Error("Username must be at least 3 characters");
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/chat" },
        });
        if (error) throw error;
        if (data.user) {
          // Create profile + role (best effort — RLS allows own inserts)
          await supabase.from("profiles").insert({ id: data.user.id, username: username.trim() });
          await supabase.from("user_roles").insert({ user_id: data.user.id, role: "user" });
          toast.success("Account created!");
          navigate({ to: "/chat" });
        } else {
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/chat" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute top-6 left-6">
        <Link to="/"><Logo /></Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl bg-card/80 backdrop-blur-xl border border-border/60 p-8 shadow-[var(--shadow-card)]">
          <h1 className="text-3xl font-black mb-2">
            {mode === "signup" ? "Join Mingle" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {mode === "signup" ? "Pick a name. Start chatting." : "Sign in to keep mingling."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="cool_panda" required minLength={3} />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-brand text-background hover:opacity-90 font-bold rounded-xl">
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="text-gradient font-semibold">Sign in</button>
              </>
            ) : (
              <>New to Mingle?{" "}
                <button onClick={() => setMode("signup")} className="text-gradient font-semibold">Create one</button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}