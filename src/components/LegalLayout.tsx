import { Link, useNavigate } from "@tanstack/react-router";
import { Home, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function LegalHeader({ backTo, backLabel }: { backTo?: any; backLabel?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleHome = async (e: React.MouseEvent) => {
    if (user) {
      e.preventDefault();
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate({ to: "/" });
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex w-full items-center justify-between px-4 sm:px-6 py-3 max-w-5xl mx-auto">
        <Logo to="/" size="md" />
        <nav className="flex items-center gap-2">
          <a
            href="/"
            onClick={handleHome}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-accent cursor-pointer"
          >
            <Home className="h-3.5 w-3.5" /> Home
          </a>
          {user && (
            <Link
              to={"/dashboard" as any}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </Link>
          )}
          {!user && (
            <Link
              to={"/login" as any}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15"
            >
              Sign in ›
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t border-border bg-card px-4 sm:px-6 py-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo to="/" size="sm" />
        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <Link to={"/privacy" as any} className="hover:text-primary transition-colors">Privacy</Link>
          <Link to={"/terms" as any} className="hover:text-primary transition-colors">Terms</Link>
          <Link to={"/cookies" as any} className="hover:text-primary transition-colors">Cookies</Link>
          <Link to={"/faq" as any} className="hover:text-primary transition-colors">FAQ</Link>
          <Link to={"/contact" as any} className="hover:text-primary transition-colors">Contact</Link>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} GilaniAI · Nairobi, Kenya</p>
      </div>
    </footer>
  );
}

export function LegalHero({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border bg-sidebar px-6 py-12 text-center">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">{label}</p>
      <h1 className="font-serif text-4xl font-bold text-foreground">{title}</h1>
      {subtitle && <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-serif text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
        {title}
      </h2>
      <div className="space-y-3 text-muted-foreground [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:text-foreground [&_a]:text-primary [&_a]:hover:underline [&_a]:transition-colors">
        {children}
      </div>
    </div>
  );
}
