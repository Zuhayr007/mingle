import { Link, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Shield, LogOut, User as UserIcon } from "lucide-react";

export function Nav() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between px-4 h-16">
        <Link to="/"><Logo /></Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                  <Shield className="w-4 h-4" /> Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                <UserIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{profile?.username ?? "Profile"}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
              <Button size="sm" onClick={() => navigate("/auth?mode=signup")} className="bg-gradient-brand text-background hover:opacity-90 font-semibold">
                Get started
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}