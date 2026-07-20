import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { PanelRight } from "lucide-react";
import { Logo } from "@/client/components/ui/logo";
import { Button } from "@/client/components/ui/button";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "#demo", label: "Demo" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  return (
    <nav className="fixed top-0 left-0 z-50 h-[72px] w-full border-b border-white/5 bg-[#161210]/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <Logo to="/" size="md" />

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[rgba(255,255,255,0.75)]">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            search={{ redirect: undefined, signout: undefined }}
            className="hidden sm:inline-flex text-sm font-medium text-[rgba(255,255,255,0.75)] hover:text-white transition-colors px-3 py-2"
          >
            Sign In
          </Link>
          <Button
            asChild
            className="hidden sm:inline-flex rounded-full bg-[#C96A3D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#E28743]"
          >
            <Link to="/login" search={{ redirect: undefined, signout: undefined }}>
              Get Started
            </Link>
          </Button>

          {/* Mobile menu trigger + inline dropdown */}
          <div ref={menuRef} className="relative md:hidden">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileOpen((o) => !o)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:text-white transition-colors"
            >
              <PanelRight className="h-5 w-5" />
            </button>

            {mobileOpen && (
              <div className="absolute right-0 top-full mt-3 z-50 flex flex-col min-w-[160px] bg-[#161210]/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl gap-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 rounded-lg bg-white/5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white transition-colors text-left"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-1 flex flex-col gap-1 border-t border-white/10 pt-2">
                  <Link
                    to="/login"
                    search={{ redirect: undefined, signout: undefined }}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 rounded-lg bg-white/5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white transition-colors text-left"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    search={{ redirect: undefined, signout: undefined }}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 rounded-lg bg-[#C96A3D]/10 text-sm font-semibold text-[#E28743] hover:bg-[#C96A3D]/20 transition-colors text-left"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
