import { Link, useNavigate } from "@tanstack/react-router";
import { Home, LayoutDashboard, Sparkles } from "lucide-react";
import { Logo } from "@/client/components/ui/logo";
import { useAuth } from "@/client/hooks/use-auth";
import { supabase } from "@/client/supabase";
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
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0f1117]/85 backdrop-blur-xl">
      <div className="flex w-full items-center justify-between px-4 sm:px-8 py-3.5 max-w-7xl mx-auto">
        <Logo to="/" size="md" />
        <nav className="flex items-center gap-2">
          <a
            href="/"
            onClick={handleHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9ca3af] hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/4 cursor-pointer"
          >
            <Home className="h-3.5 w-3.5" /> Home
          </a>
          {user && (
            <Link
              to={"/tutor" as any}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#d9531e] hover:text-[#c44819] transition-colors px-3 py-2 rounded-lg bg-[#d9531e]/10 hover:bg-[#d9531e]/15"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </Link>
          )}
          {!user && (
            <Link
              to={"/login" as any}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#d9531e] hover:text-[#c44819] transition-colors px-3 py-2 rounded-lg bg-[#d9531e]/10 hover:bg-[#d9531e]/15"
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
    <footer className="border-t border-white/6 bg-[#0c0e14] px-4 sm:px-8 py-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <Logo to="/" size="sm" />
        <div className="flex flex-wrap justify-center gap-6 text-xs text-[#9ca3af]">
          {[
            { label: "Privacy", to: "/privacy" },
            { label: "Terms", to: "/terms" },
            { label: "Cookies", to: "/cookies" },
            { label: "FAQ", to: "/faq" },
            { label: "Contact", to: "/contact" },
          ].map(({ label, to }) => (
            <Link key={label} to={to as any} className="hover:text-[#d9531e] transition-colors">
              {label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-[#6b7280]">
          © {new Date().getFullYear()} GilaniAI · Nairobi, Kenya
        </p>
      </div>
    </footer>
  );
}

export function LegalHero({
  label,
  title,
  subtitle,
}: {
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="relative overflow-hidden border-b border-white/5 py-12 sm:py-16 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_-10%,rgba(217,83,30,0.06),transparent_60%)]" />
      </div>
      <div className="relative max-w-xl mx-auto px-4 sm:px-6 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d9531e]/30 bg-[#d9531e]/8 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[#d9531e] mb-1">
          <Sparkles className="h-3 w-3" />
          {label}
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-black text-white">{title}</h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#9ca3af] leading-relaxed">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2 border-b border-white/6 pb-2">
        {title}
      </h2>
      <div className="space-y-3.5 text-sm text-[#9ca3af] [&_ul]:pl-5 [&_ul]:space-y-2 [&_ul]:list-disc [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:text-white [&_a]:text-[#d9531e] [&_a]:font-semibold [&_a]:hover:underline [&_a]:transition-colors">
        {children}
      </div>
    </div>
  );
}
