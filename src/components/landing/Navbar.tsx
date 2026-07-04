import { Link } from "@tanstack/react-router";

export default function Navbar() {
    return (
        <nav className="sticky top-0 z-50 h-[72px] w-full border-b border-white/5 bg-[#121212]/80 backdrop-blur-md">
            <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
                <Link to="/" search={{}} className="text-xl font-bold tracking-tight text-white">
                    GilaniAI
                </Link>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[rgba(255,255,255,0.75)]">
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
                    <a href="#plans" className="hover:text-white transition-colors">Pricing</a>
                    <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
                </div>

                <div className="flex items-center gap-4">
                    <Link 
                        to="/"
                        search={{ authModalOpen: true }}
                        className="text-sm font-medium text-[rgba(255,255,255,0.75)] hover:text-white transition-colors"
                    >
                        Sign in
                    </Link>
                    <Link 
                        to="/"
                        search={{ authModalOpen: true }}
                        className="rounded-full bg-[#C96A3D] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#E28743]"
                    >
                        Register
                    </Link>
                </div>
            </div>
        </nav>
    );
}
