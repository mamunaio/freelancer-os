import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import injaazhLogo from "@/assets/injaazh-logo.png";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow animate-pulse-glow overflow-hidden">
            <img src={injaazhLogo} alt="Injaazh OS" className="h-full w-full object-cover" width={48} height={48} />
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Booting Injaazh OS</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="glass max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold">Access denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This workspace is restricted to authorized administrators only.
          </p>
          <Button variant="outline" className="mt-5" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
