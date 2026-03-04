import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function Header() {
  const { user, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

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
    </>
  );
}
