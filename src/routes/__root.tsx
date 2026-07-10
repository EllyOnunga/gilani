import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Analytics } from "@vercel/analytics/react";
import * as Sentry from "@sentry/react";

import appCss from "../styles.css?url";
import { CookieBanner, COOKIE_CONSENT_EVENT } from "@/components/CookieBanner";

function ConsentGatedAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setAllowed(localStorage.getItem("gilani_analytics_consent") === "true");
    check();
    window.addEventListener(COOKIE_CONSENT_EVENT, check);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, check);
  }, []);

  if (!allowed) return null;
  return <Analytics />;
}

/** Thin top-of-page progress bar that shows during route transitions */
function NavProgressBar() {
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let grow: ReturnType<typeof setInterval>;
    if (isLoading) {
      setVisible(true);
      setWidth(15);
      grow = setInterval(() => {
        setWidth((w) => (w < 85 ? w + (85 - w) * 0.08 : w));
      }, 120);
    } else if (visible) {
      setWidth(100);
      const hide = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 350);
      return () => clearTimeout(hide);
    }
    return () => clearInterval(grow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        height: "2px",
        width: `${width}%`,
        transition: isLoading ? "width 0.12s ease-out" : "width 0.25s ease-out",
        background: "linear-gradient(90deg, hsl(22 96% 45%), hsl(35 95% 55%))",
        boxShadow: "0 0 8px hsl(22 96% 45% / 0.6)",
      }}
    />
  );
}

if (typeof window !== "undefined" && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">404</p>
        <h1 className="mt-3 font-serif text-4xl text-foreground">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This corner of the library is empty. Let's get you back to your studies.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  useEffect(() => {
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  // Use a hard navigation instead of reset() for root-level errors
  // reset() tries to reconcile the broken tree; href="/" does a clean remount
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl text-foreground">Something interrupted the lesson</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try again, or head back to your dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
const SITE_URL = "https://gilaniai.site";
const OG_IMAGE = `${SITE_URL}/icon-512.png`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const metaTags = [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#d9531e" },
      { name: "robots", content: "index, follow" },
      { name: "googlebot", content: "index, follow" },
      { name: "author", content: "GilaniAI" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "GilaniAI" },
      { name: "format-detection", content: "telephone=no" },
      {
        name: "keywords",
        content:
          "AI tutor, study assistant, KCSE AI tutor, CBC study assistant, Cambridge IGCSE revision, Edexcel IGCSE tutor, Canadian curriculum AI, any curriculum AI tutor, GilaniAI",
      },
      { title: "GilaniAI — Ethical AI Learning Assistant" },
      {
        name: "description",
        content:
          "Curriculum-grounded AI tutoring, notes summarization, quizzes, and study planning for any curriculum — KCSE, CBC, Cambridge IGCSE, Edexcel, Canadian and more. Human oversight built in.",
      },
      // Open Graph
      { property: "og:site_name", content: "GilaniAI" },
      { property: "og:locale", content: "en_KE" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:title", content: "GilaniAI — AI Study Assistant for Any Curriculum" },
      {
        property: "og:description",
        content:
          "Curriculum-grounded AI tutoring, notes summarization, quizzes, and study planning for any curriculum — KCSE, CBC, Cambridge IGCSE, Edexcel, Canadian and more. Human oversight built in.",
      },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { property: "og:image:alt", content: "GilaniAI — Ethical AI Study Assistant" },
      // Twitter / X Cards
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@GilaniAI" },
      { name: "twitter:title", content: "GilaniAI — AI Study Assistant for Any Curriculum" },
      {
        name: "twitter:description",
        content:
          "AI tutoring for any curriculum — KCSE, CBC, IGCSE, Canadian and more. Quizzes, notes, planner and real teacher escalation — all in one place.",
      },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: "GilaniAI logo" },
      // Facebook / Instagram / WhatsApp social profile attribution
      { property: "og:see_also", content: "https://www.facebook.com/Gilaniai" },
      { property: "og:see_also", content: "https://www.instagram.com/gilani_ai" },
      { property: "og:see_also", content: "https://wa.me/254102880577" },
      // Facebook App Link (helps FB crawler resolve the page)
      { property: "al:web:url", content: SITE_URL },
    ];

    if (import.meta.env.VITE_GOOGLE_SITE_VERIFICATION) {
      metaTags.push({
        name: "google-site-verification",
        content: import.meta.env.VITE_GOOGLE_SITE_VERIFICATION,
      });
    }

    return {
      meta: metaTags,
      links: [
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/manifest.json" },
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://lxgwoizxoqnymkkwaplq.supabase.co" },
        { rel: "dns-prefetch", href: "https://lxgwoizxoqnymkkwaplq.supabase.co" },
        { rel: "preconnect", href: "https://cdnjs.cloudflare.com", crossOrigin: "anonymous" },
        { rel: "dns-prefetch", href: "https://cdn.jsdelivr.net" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GilaniAI",
  url: "https://gilaniai.site",
  description:
    "Curriculum-grounded AI tutoring platform supporting any curriculum — KCSE, CBC, CBE, Cambridge IGCSE, Edexcel IGCSE, Canadian Curriculum and more. Includes Socratic AI tutoring chat and real teacher escalation.",
  applicationCategory: "EducationApplication",
  operatingSystem: "Web, Android, iOS",
  offers: [
    { "@type": "Offer", price: "0", priceCurrency: "KES", name: "Free plan" },
    { "@type": "Offer", price: "500", priceCurrency: "KES", name: "Pro plan" },
  ],
  author: { "@type": "Organization", name: "GilaniAI", url: "https://gilaniai.site" },
  inLanguage: ["en"],
  audience: {
    "@type": "Audience",
    audienceType: "Students",
    geographicArea: { "@type": "Country", name: "Kenya" },
  },
});

const ORG_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GilaniAI",
  url: SITE_URL,
  logo: OG_IMAGE,
  sameAs: [
    "https://www.facebook.com/Gilaniai",
    "https://www.instagram.com/gilani_ai",
    "https://wa.me/254102880577",
  ],
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Theme init — must run before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem("theme");
                if (storedTheme === "dark" || (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
                  document.documentElement.classList.add("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                }
              } catch (_) {}
            `,
          }}
        />
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ORG_JSON_LD }} />
      </head>
      <body suppressHydrationWarning style={{ background: "hsl(var(--background, 24 15% 8%))" }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;var t=localStorage.getItem("theme")||"system";var dark=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme:dark)").matches);d.classList.toggle("dark",dark);document.body.style.background=dark?"#0f1117":"#ffffff"})()`,
          }}
        />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthInvalidator() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [toasterPos, setToasterPos] = useState<"top-right" | "top-center">("top-right");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSW = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[GilaniAI PWA] ServiceWorker registered successfully:", reg.scope);
        })
        .catch((err) => {
          console.error("[GilaniAI PWA] ServiceWorker registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, []);

  // Capture the browser's native PWA install prompt and surface it via a custom event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store prompt on window so any component can access it
      (window as any).__pwaInstallPrompt = e;
      // Notify sidebar / other components that the app is installable
      window.dispatchEvent(new CustomEvent("custom:pwa-installable"));
    };

    const handleAppInstalled = () => {
      (window as any).__pwaInstallPrompt = null;
      window.dispatchEvent(new CustomEvent("custom:pwa-installed"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      const isMobile = window.matchMedia("(max-width: 640px)").matches;
      setToasterPos(isMobile ? "top-center" : "top-right");
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const safeReload = (reason: string) => {
      const reloadKey = "gilaniai_last_chunk_reload";
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();

      // Limit auto-reloads to once every 15 seconds to avoid loops in offline mode or server issues
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem(reloadKey, now.toString());
        console.warn(`[GilaniAI] Reloading page due to: ${reason}`);
        window.location.reload();
      } else {
        console.error(`[GilaniAI] Chunk load failure detected but reload rate-limited: ${reason}`);
      }
    };

    const handlePreloadError = () => {
      safeReload("Vite preload error (outdated assets after redeployment)");
    };

    const handleGlobalError = (event: ErrorEvent) => {
      const message = event.message || "";
      const filename = event.filename || "";

      // Case 1: Syntax error (unexpected '<') from HTML fallback when JS file 404s
      if (
        message.includes("Unexpected token '<'") &&
        (filename.includes("/assets/") || filename.includes(".js"))
      ) {
        safeReload("Outdated chunk HTML parsing error");
        return;
      }

      // Case 2: Static asset resource load error (e.g., <script src="..."> or <link href="..."> failed to load)
      const target = event.target as any;
      if (target && (target.tagName === "SCRIPT" || target.tagName === "LINK")) {
        const url = target.src || target.href || "";
        if (url.includes("/assets/") || url.endsWith(".js") || url.endsWith(".css")) {
          safeReload(`Failed to load asset resource: ${url}`);
        }
      }
    };

    // Case 3: Dynamic import() promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);

      if (
        message.includes("dynamically imported module") ||
        message.includes("Failed to fetch dynamically") ||
        (message.includes("Failed to fetch") && window.location.pathname !== "/tutor")
      ) {
        safeReload(`Dynamic import rejection: ${message}`);
      }
    };

    window.addEventListener("vite:preloadError", handlePreloadError);
    window.addEventListener("error", handleGlobalError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("vite:preloadError", handlePreloadError);
      window.removeEventListener("error", handleGlobalError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NavProgressBar />
      <AuthInvalidator />
      <Outlet />
      <Toaster position={toasterPos} />
      <ConsentGatedAnalytics />
      <CookieBanner />
    </QueryClientProvider>
  );
}
