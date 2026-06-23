import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageCircle, Clock, MapPin, Send, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { submitContactFn } from "@/lib/contact.server-fns";
import { LegalHeader, LegalFooter } from "@/components/LegalLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — GilaniAI" },
      { name: "description", content: "Get in touch with the GilaniAI team for support, feedback, or partnership enquiries." },
    ],
  }),
  component: ContactPage,
});

const FAQ_ITEMS = [
  { q: "How do I reset my password?", a: "Go to the login page and click 'Forgot password'. A reset link will be sent to your registered email." },
  { q: "Is GilaniAI free to use?", a: "Yes — there's a free tier with generous daily limits. The Scholar plan (KSh 499/mo) unlocks unlimited sessions and priority support." },
  { q: "How do I escalate to a human teacher?", a: "Inside any tutor chat session, click 'Escalate' in the sidebar. A qualified teacher will review your query." },
  { q: "Is my data safe and private?", a: "Yes. GilaniAI is built under Kenya's Data Protection Act 2019. Your study data is never sold or shared with third parties." },
];

type FormState = "idle" | "sending" | "success" | "error";
type Category = "general" | "bug" | "billing" | "account" | "partnership" | "press" | "other";

function ContactPage() {
  const [form, setForm] = useState<{ name: string; email: string; subject: string; category: Category; message: string }>({
    name: "", email: "", subject: "", category: "general", message: "",
  });
  const [status, setStatus] = useState<FormState>("idle");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const canSubmit = form.name.trim() !== "" && form.email.trim() !== "" && form.message.trim() !== "" && status !== "sending";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LegalHeader />

      {/* Hero */}
      <div className="border-b border-border bg-sidebar px-4 py-8 sm:py-12 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">Support</p>
        <h1 className="font-serif text-2xl sm:text-4xl font-bold text-foreground">Contact Us</h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Got a question, bug report, or partnership inquiry? We're a small team and we read every message.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" />
          Typical reply within 24 hours (Mon–Fri)
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 grid gap-8 lg:grid-cols-3">
        {/* Info sidebar */}
        <div className="space-y-4 lg:col-span-1">
          {[
            {
              icon: Mail, title: "Email us",
              body: <a href="mailto:support@gilaniai.site" className="text-xs font-medium text-primary hover:underline break-all">support@gilaniai.site</a>,
              sub: "For general enquiries, account issues, and billing questions."
            },
            {
              icon: MapPin, title: "Based in Kenya",
              body: <p className="text-xs text-muted-foreground leading-relaxed">Nairobi, Kenya 🇰🇪</p>,
              sub: "Building for students across the country."
            },
            {
              icon: MessageCircle, title: "Follow us",
              body: (
                <div className="flex flex-col gap-2">
                  <a href="https://twitter.com/GilaniAI" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    @GilaniAI on X / Twitter <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                  <a href="https://github.com/gilaniai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    github.com/gilaniai <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </div>
              ),
              sub: ""
            },
          ].map(({ icon: Icon, title, body, sub }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold">{title}</p>
              </div>
              {sub && <p className="text-xs text-muted-foreground leading-relaxed mb-2">{sub}</p>}
              {body}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-serif text-xl font-bold text-foreground mb-1">Send a message</h2>
            <p className="text-xs text-muted-foreground mb-6">Fill in the form and we'll get back to you as soon as possible.</p>

            {status === "success" ? (
              <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                  <CheckCircle className="h-7 w-7 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Message received!</p>
                  <p className="mt-1 text-sm text-muted-foreground">We'll reply to your email within 24 hours.</p>
                </div>
                <button onClick={() => setStatus("idle")} className="mt-2 text-xs text-primary hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Full name <span className="text-destructive">*</span></label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Amina Wanjiku"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Email address <span className="text-destructive">*</span></label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Category</label>
                    <select name="category" value={form.category} onChange={handleChange}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors">
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
                    <label className="block text-xs font-medium text-foreground mb-1.5">Subject</label>
                    <input name="subject" value={form.subject} onChange={handleChange} placeholder="Brief summary"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Message <span className="text-destructive">*</span></label>
                  <textarea name="message" value={form.message} onChange={handleChange} rows={5}
                    placeholder="Describe your question or issue in as much detail as possible…"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none" />
                  <p className="mt-1 text-right text-[11px] text-muted-foreground">{form.message.length} chars</p>
                </div>

                {status === "error" && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Something went wrong. Please try again or email us directly.
                  </div>
                )}

                <button onClick={handleSubmit} disabled={!canSubmit}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {status === "sending" ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> Sending…</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send message</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section className="border-t border-border bg-sidebar px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-widest text-primary text-center mb-2">FAQ</p>
          <h2 className="font-serif text-2xl font-bold text-foreground text-center mb-8">Common questions</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors text-left gap-4"
                >
                  {item.q}
                  <span className="text-muted-foreground text-lg leading-none shrink-0">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 pt-3 text-sm text-muted-foreground leading-relaxed border-t border-border bg-muted/20">
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
