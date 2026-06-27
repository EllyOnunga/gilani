import { useState } from "react";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userId?: string;
  userEmail?: string;
  userName?: string;
  variant?: "banner" | "inline" | "card";
}

export function NewsletterSubscribe({ userId, userEmail, userName, variant = "card" }: Props) {
  const [email, setEmail] = useState(userEmail || "");
  const [name, setName] = useState(userName || "");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, user_id: userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSubscribed(true);
      toast.success(data.message || "Subscribed successfully!");
    } catch (err: any) {
      toast.error(err?.message ?? "Subscription failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 ${variant === "banner" ? "w-full" : ""}`}
      >
        <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-700">You're subscribed!</p>
          <p className="text-xs text-emerald-600">Check your email for a welcome message.</p>
        </div>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className="w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Mail className="h-4 w-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">Stay updated with GilaniAI</p>
              <p className="text-xs text-muted-foreground">
                Study tips, new features and exam guides.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 sm:w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Subscribe"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Mail className="h-4 w-4" /> Subscribe
            </>
          )}
        </button>
      </div>
    );
  }

  // Default: card
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <h3 className="font-serif text-lg font-bold">Stay in the Loop</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Get study tips, new features, and exam guides delivered to your inbox.
      </p>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Subscribing...
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" /> Subscribe to Newsletter
          </>
        )}
      </button>
      <p className="text-center font-mono text-[9px] text-muted-foreground">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}
