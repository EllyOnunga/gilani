import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "../ui/logo";
import pkg from "../../../package.json";

export default function Footer() {
    const [subEmail, setSubEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subEmail.trim()) return;
        try {
            const res = await fetch("/api/newsletter/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: subEmail }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSubscribed(true);
            toast.success(data.message || "Thank you for subscribing to GilaniAI newsletters!");
            setSubEmail("");
        } catch (err: any) {
            toast.error(err?.message ?? "Subscription failed. Try again.");
        }
    };

    return (
        <footer className="w-full border-t border-white/10 bg-[#121212]">
            <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-12">

                {/* Brand & Socials */}
                <div className="col-span-2 flex flex-col gap-4 md:col-span-4">
                    <Logo to="/" size="md" />
                    <p className="max-w-xs text-sm text-[rgba(255,255,255,0.6)]">
                        Your intelligent AI study assistant. Learn smarter, faster, and better.
                    </p>
                    <div className="flex items-center gap-4 text-[#C96A3D] mt-2">
                        <a href="#" className="hover:text-[#E28743] transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                        </a>
                        <a href="#" className="hover:text-[#E28743] transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.68c.223-.198-.054-.31-.346-.116l-6.405 4.02-2.76-.86c-.6-.188-.616-.605.126-.894l10.77-4.148c.5-.188.94.116.805.895z" /></svg>
                        </a>
                    </div>
                </div>

                {/* Newsletter & Contact */}
                <div className="col-span-2 flex flex-col gap-4 md:col-span-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Stay in the loop</span>
                    {subscribed ? (
                        <div className="text-sm text-emerald-500 font-medium">
                            Thanks for subscribing!
                        </div>
                    ) : (
                        <form onSubmit={handleSubscribe} className="flex gap-2 w-full max-w-sm">
                            <input
                                type="email"
                                required
                                placeholder="Enter your email..."
                                value={subEmail}
                                onChange={(e) => setSubEmail(e.target.value)}
                                className="flex-1 min-w-0 rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#C96A3D]/50"
                            />
                            <button
                                type="submit"
                                className="rounded-lg bg-[#C96A3D] px-4 py-2 text-sm font-bold text-white hover:bg-[#E28743] transition-colors flex-shrink-0"
                            >
                                Join
                            </button>
                        </form>
                    )}

                    <div className="flex flex-col gap-2 text-sm text-[rgba(255,255,255,0.6)] mt-2">
                        <p className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-[#C96A3D] flex-shrink-0" />
                            support@gilaniai.site
                        </p>
                        <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-[#C96A3D] flex-shrink-0" />
                            0710 297 603
                        </p>
                        <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#C96A3D] flex-shrink-0" />
                            Nairobi, Kenya
                        </p>
                    </div>
                </div>

                {/* Company */}
                <div className="flex flex-col gap-3 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Company</span>
                    <Link to="/about" className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">About Us</Link>
                    <Link to="/contact" className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Contact Support</Link>
                </div>

                {/* Legal */}
                <div className="flex flex-col gap-3 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Legal</span>
                    <Link to="/privacy" className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Privacy Policy</Link>
                    <Link to="/terms" className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Terms of Service</Link>
                </div>
            </div>

            <div className="border-t border-white/5">
                <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-between">
                    <p className="text-xs text-white/30">
                        &copy; {new Date().getFullYear()} GilaniAI. All rights reserved. · v{pkg.version}
                    </p>
                    <p className="text-xs text-white/30">Made in Nairobi 🇰🇪</p>
                </div>
            </div>
        </footer>
    );
}
