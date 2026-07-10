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
            <a
              href="https://www.facebook.com/Gilaniai"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="hover:text-[#E28743] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/gilani_ai?igsh=MXIwYjBoYmhiYWlybg=="
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hover:text-[#E28743] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a
              href="https://wa.me/254102880577"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="hover:text-[#E28743] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Newsletter & Contact */}
        <div className="col-span-2 flex flex-col gap-4 md:col-span-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Stay in the loop
          </span>
          {subscribed ? (
            <div className="text-sm text-emerald-500 font-medium">Thanks for subscribing!</div>
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
            <a
              href="mailto:support@gilaniai.site"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4 text-[#C96A3D] flex-shrink-0" />
              support@gilaniai.site
            </a>
            <a
              href="tel:+254710297603"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Phone className="h-4 w-4 text-[#C96A3D] flex-shrink-0" />
              0710 297 603
            </a>
            <a
              href="https://maps.google.com/?q=Nairobi,Kenya"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <MapPin className="h-4 w-4 text-[#C96A3D] flex-shrink-0" />
              Nairobi, Kenya
            </a>
          </div>
        </div>

        {/* Company */}
        <div className="flex flex-col gap-3 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Company
          </span>
          <Link
            to="/about"
            className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
          >
            About Us
          </Link>
          <Link
            to="/contact"
            className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
          >
            Contact Support
          </Link>
        </div>

        {/* Legal */}
        <div className="flex flex-col gap-3 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Legal
          </span>
          <Link
            to="/privacy"
            className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
          >
            Terms of Service
          </Link>
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
