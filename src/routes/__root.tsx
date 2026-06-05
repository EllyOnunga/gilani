import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Analytics } from "@vercel/analytics/react";
import * as Sentry from "@sentry/react";

import appCss from "../styles.css?url";

if (typeof window !== "undefined" && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
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

const SITE_URL = "https://gilaniai.vercel.app";
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
      {
        name: "keywords",
        content:
          "KCSE AI tutor, CBC study assistant, Kenya education AI, IGCSE revision, AI tutor Kenya, study planner Kenya, KCSE revision, online tutoring Kenya, GilaniAI",
      },
      { title: "GilaniAI — Ethical AI Learning Assistant" },
      {
        name: "description",
        content:
          "Curriculum-grounded AI tutoring, notes summarization, quizzes, and study planning for KCSE and CBC students. Human oversight built in.",
      },
      // Open Graph
      { property: "og:site_name", content: "GilaniAI" },
      { property: "og:locale", content: "en_KE" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:title", content: "GilaniAI — AI Study Assistant for Kenyan Students" },
      {
        property: "og:description",
        content:
          "Curriculum-grounded AI tutoring, notes summarization, quizzes, and study planning for KCSE, CBC and IGCSE students. Human oversight built in.",
      },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { property: "og:image:alt", content: "GilaniAI — Ethical AI Study Assistant" },
      // Twitter / X Cards
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@GilaniAI" },
      { name: "twitter:title", content: "GilaniAI — AI Study Assistant for Kenyan Students" },
      {
        name: "twitter:description",
        content:
          "AI tutoring for KCSE, CBC and IGCSE students. Quizzes, notes, planner and real teacher escalation — all in one place.",
      },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: "GilaniAI logo" },
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
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/manifest.json" },
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
        },
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
  url: "https://gilaniai.vercel.app",
  description:
    "Curriculum-grounded AI tutoring platform for KCSE, CBC and IGCSE students in Kenya. Includes AI tutor, quizzes, notes summariser, study planner, and teacher escalation.",
  applicationCategory: "EducationApplication",
  operatingSystem: "Web, Android, iOS",
  offers: [
    { "@type": "Offer", price: "0", priceCurrency: "KES", name: "Free tier" },
    { "@type": "Offer", price: "499", priceCurrency: "KES", name: "Scholar plan" },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "312",
    bestRating: "5",
  },
  author: { "@type": "Organization", name: "GilaniAI", url: "https://gilaniai.vercel.app" },
  inLanguage: ["en", "sw"],
  audience: {
    "@type": "Audience",
    audienceType: "Students",
    geographicArea: { "@type": "Country", name: "Kenya" },
  },
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
                if (storedTheme === "dark" || (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches) || !storedTheme) {
                  document.documentElement.classList.add("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                }
              } catch (_) {}
            `,
          }}
        />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON_LD }}
        />
      </head>
      <body>
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
      navigator.serviceWorker.register("/sw.js")
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
        (message.includes("Failed to fetch") &&
          window.location.pathname !== "/tutor" &&
          window.location.pathname !== "/notes")
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
      <AuthInvalidator />
      <Outlet />
      <Toaster richColors position={toasterPos} />
      <Analytics />
    </QueryClientProvider>
  );
}
