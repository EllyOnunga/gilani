import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";

const NAV_LINKS = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it Works" },
    { href: "#demo", label: "Demo" },
    { href: "#plans", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 z-50 h-[72px] w-full border-b border-white/5 bg-[#161210]/80 backdrop-blur-md">
            <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
                <Logo to="/" size="md" />

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[rgba(255,255,255,0.75)]">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="hover:text-white transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        to="/"
                        search={{ authModalOpen: true }}
                        className="hidden sm:inline-flex text-sm font-medium text-[rgba(255,255,255,0.75)] hover:text-white transition-colors px-3 py-2"
                    >
                        Sign In
                    </Link>
                    <Button
                        asChild
                        className="hidden sm:inline-flex rounded-full bg-[#C96A3D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#E28743]"
                    >
                        <Link to="/" search={{ authModalOpen: true }}>
                            Get Started
                        </Link>
                    </Button>

                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger asChild>
                            <button
                                type="button"
                                aria-label="Open menu"
                                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="bg-[#161210]/80 backdrop-blur-md border-white/10 text-white w-4/5 h-fit top-0 bottom-auto"
                        >
                            <div className="mt-10 flex flex-col gap-1">
                                {NAV_LINKS.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMobileOpen(false)}
                                        className="rounded-md px-3 py-3 text-base font-medium text-white/85 hover:bg-white/5 hover:text-white transition-colors"
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>

                            <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
                                <Link
                                    to="/"
                                    search={{ authModalOpen: true }}
                                    onClick={() => setMobileOpen(false)}
                                    className="text-center rounded-md px-4 py-2.5 text-sm font-medium text-white/85 hover:text-white transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Button
                                    asChild
                                    className="rounded-full bg-[#C96A3D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#E28743]"
                                >
                                    <Link
                                        to="/"
                                        search={{ authModalOpen: true }}
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Get Started
                                    </Link>
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </nav>
    );
}
