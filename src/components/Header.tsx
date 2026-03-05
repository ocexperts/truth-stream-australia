import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "./AuthModal";
import { MFAChallenge } from "./MFA";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function Header() {
  const { user, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [needsMFA, setNeedsMFA] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasAdminAccess(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const roles = data?.map((r) => r.role) || [];
        setHasAdminAccess(roles.includes("admin") || roles.includes("editor"));
      });

    // Check if user has MFA enrolled but not yet verified this session
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (data && data.nextLevel === "aal2" && data.currentLevel === "aal1") {
        setNeedsMFA(true);
      }
    });
  }, [user]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-2xl font-black tracking-tight">
              <span className="text-gradient-danger">ARN</span>
            </span>
            <span className="hidden text-xs font-body uppercase tracking-[0.2em] text-muted-foreground sm:block">
              Australian Review Network
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/stories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Stories
            </Link>
            <Link to="/submit" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Submit
            </Link>
            {hasAdminAccess && (
              <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Admin
              </Link>
            )}
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/submit">
                  <Button variant="hero" size="sm">Share Your Story</Button>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Button variant="hero" size="sm" onClick={() => setShowAuth(true)}>
                Sign In
              </Button>
            )}
          </nav>
        </div>
      </header>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {needsMFA && <MFAChallenge onVerified={() => setNeedsMFA(false)} />}
    </>
  );
}
