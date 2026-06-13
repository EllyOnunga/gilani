import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export function LegalHeader({ backTo = "/" as any, backLabel = "Back to home" }: { backTo?: any; backLabel?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex w-full items-center justify-between px-4 sm:px-6 py-3 max-w-5xl mx-auto">
        <Logo to="/" size="md" />
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
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
