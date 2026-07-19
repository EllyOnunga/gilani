import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mail,
  MessageCircle,
  Clock,
  MapPin,
  Send,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Phone,
  Sparkles,
} from "lucide-react";
import { submitContactFn } from "@/fns/contact.server-fns";
import { LegalHeader, LegalFooter } from "@/client/components/LegalLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — GilaniAI" },
      {
        name: "description",
        content:
          "Get in touch with the GilaniAI team for support, feedback, or partnership enquiries.",
      },
      { property: "og:image", content: "https://gilaniai.site/og-contact.png" },
      { name: "twitter:image", content: "https://gilaniai.site/og-contact.png" },
    ],
  }),
  component: ContactPage,
});

const FAQ_ITEMS = [
  {
    q: "How do I reset my password?",
    a: "Go to the login page and click 'Forgot password'. A reset link will be sent to your registered email.",
  },
  {
    q: "Is GilaniAI free to use?",
    a: "Yes — there's a free tier with generous daily limits. The Pro plan (KES 500/mo) unlocks unlimited sessions and priority support.",
  },
  {
    q: "How do I escalate to a human teacher?",
    a: "Inside any tutor chat session, click 'Escalate' in the sidebar. A qualified teacher will review your query.",
  },
  {
    q: "Is my data safe and private?",
    a: "Yes. GilaniAI is built under Kenya's Data Protection Act 2019. Your study data is never sold or shared with third parties.",
  },
];

type FormState = "idle" | "sending" | "success" | "error";
type Category = "general" | "bug" | "billing" | "account" | "partnership" | "press" | "other";

function ContactPage() {
  const [form, setForm] = useState<{
    name: string;
    email: string;
    subject: string;
    category: Category;
    message: string;
  }>({
    name: "",
    email: "",
    subject: "",
    category: "general",
    message: "",
  });
  const [status, setStatus] = useState<FormState>("idle");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) return;
    setStatus("sending");
    try {
      await submitContactFn({ data: form });
      setStatus("success");
      setForm({ name: "", email: "", subject: "", category: "general", message: "" });
    } catch {
      setStatus("error");
    }
  };

  const canSubmit =
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.message.trim() !== "" &&
    status !== "sending";

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e2e4f0] flex flex-col overflow-x-hidden">
      <LegalHeader />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5 py-12 sm:py-20 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(217,83,30,0.08),transparent_60%)]" />
        </div>
        <div className="relative max-w-xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d9531e]/30 bg-[#d9531e]/8 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#d9531e] mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            Support Center
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-black text-white">Contact Us</h1>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            Got a question, bug report, or partnership inquiry? We're a small team and we read every
            message.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/6 bg-[#1a1d27]/50 px-4 py-2 text-xs text-[#9ca3af]">
            <Clock className="h-3.5 w-3.5 text-[#d9531e]" />
            Typical reply within 24 hours (Mon–Fri)
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-10 sm:py-16 grid gap-8 lg:grid-cols-3">
        {/* Info sidebar */}
        <div className="space-y-4 lg:col-span-1">
          {[
            {
              icon: Mail,
              title: "Support & Billing",
              body: (
                <a
                  href="mailto:support@gilaniai.site"
                  className="text-xs font-semibold text-[#d9531e] hover:underline break-all"
                >
                  support@gilaniai.site
                </a>
              ),
              sub: "For account issues, billing questions, and general enquiries.",
            },
            {
              icon: Phone,
              title: "Phone Support",
              body: <p className="text-xs font-semibold text-[#d9531e]">0710 297 603</p>,
              sub: "Call or text us directly for immediate assistance.",
            },
            {
              icon: MapPin,
              title: "Based in Kenya",
              body: <p className="text-xs text-[#9ca3af] leading-relaxed">Nairobi, Kenya 🇰🇪</p>,
              sub: "Building local educational technology for students across the country.",
            },
            {
              icon: MessageCircle,
              title: "Follow us",
              body: (
                <div className="flex flex-col gap-2">
                  <a
                    href="https://twitter.com/GilaniAI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[#9ca3af] hover:text-white transition-colors"
                  >
                    @GilaniAI on X / Twitter{" "}
                    <ExternalLink className="h-3 w-3 ml-auto text-[#6b7280]" />
                  </a>
                  <a
                    href="https://github.com/gilaniai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[#9ca3af] hover:text-white transition-colors"
                  >
                    github.com/gilaniai <ExternalLink className="h-3 w-3 ml-auto text-[#6b7280]" />
                  </a>
                </div>
              ),
              sub: "",
            },
          ].map(({ icon: Icon, title, body, sub }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/8 bg-[#1a1d27] p-5 hover:border-white/12 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/4 border border-white/8">
                  <Icon className="h-4 w-4 text-[#d9531e]" />
                </div>
                <p className="text-sm font-bold text-white">{title}</p>
              </div>
              {sub && <p className="text-xs text-[#9ca3af] leading-relaxed mb-2.5">{sub}</p>}
              {body}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/8 bg-[#1a1d27] p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-white mb-1.5">Send a message</h2>
              <p className="text-xs text-[#9ca3af]">
                Fill in the form below and we will get back to you as soon as possible.
              </p>
            </div>

            {status === "success" ? (
              <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Message received!</p>
                  <p className="mt-1 text-sm text-[#9ca3af]">
                    We'll reply to your email within 24 hours.
                  </p>
                </div>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-2 text-xs text-[#d9531e] font-semibold hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
                      Full name <span className="text-[#d9531e]">*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Amina Wanjiku"
                      className="w-full rounded-xl border border-white/8 bg-[#0f1117] px-4 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#d9531e]/50 focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
                      Email address <span className="text-[#d9531e]">*</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-white/8 bg-[#0f1117] px-4 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#d9531e]/50 focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
                      Category
                    </label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/8 bg-[#0f1117] px-4 py-3 text-sm text-[#9ca3af] focus:border-[#d9531e]/50 focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50 transition-colors"
                    >
                      <option value="general">General enquiry</option>
                      <option value="bug">Bug report</option>
                      <option value="billing">Billing / subscription</option>
                      <option value="account">Account issue</option>
                      <option value="partnership">School partnership</option>
                      <option value="press">Press / media</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
                      Subject
                    </label>
                    <input
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      placeholder="Brief summary"
                      className="w-full rounded-xl border border-white/8 bg-[#0f1117] px-4 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#d9531e]/50 focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
                    Message <span className="text-[#d9531e]">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Describe your question or issue in as much detail as possible…"
                    className="w-full rounded-xl border border-white/8 bg-[#0f1117] px-4 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#d9531e]/50 focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50 transition-colors resize-none"
                  />
                  <p className="mt-1.5 text-right text-[10px] font-mono text-[#6b7280]">
                    {form.message.length} chars
                  </p>
                </div>

                {status === "error" && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Something went wrong. Please try again or email us directly.
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d9531e] px-4 py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#c44819] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#d9531e]/25"
                >
                  {status === "sending" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Send message
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAQ Accordions on Contact Page */}
      <section className="border-t border-white/5 bg-[#12151e] px-4 sm:px-8 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#d9531e] font-bold">
              FAQ
            </p>
            <h2 className="font-serif text-2xl font-bold text-white">Common questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/8 bg-[#1a1d27] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-white hover:bg-white/2 transition-colors text-left gap-4"
                >
                  {item.q}
                  <span className="text-[#d9531e] text-lg leading-none shrink-0">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-3 text-sm text-[#9ca3af] leading-relaxed border-t border-white/6 bg-[#0f1117]/30">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <LegalFooter />
    </div>
  );
}
