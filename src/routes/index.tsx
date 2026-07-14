import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/client/hooks/use-auth";
import { GilaniLoader } from "@/client/components/GilaniLoader";
import { AuthModal } from "@/client/components/auth/AuthModal";

import {
  Navbar,
  Hero,
  SocialProof,
  Features,
  HowItWorks,
  DemoSection,
  Testimonials,
  Pricing,
  FAQ,
  FinalCTA,
  Footer,
} from "@/client/components/landing";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { authModalOpen?: boolean } => ({
    authModalOpen: search.authModalOpen === "true" || search.authModalOpen === true || undefined,
  }),
  head: () => ({
    meta: [
      { title: "GilaniAI — AI Study Assistant for Students" },
      {
        name: "description",
        content:
          "GilaniAI is your AI-powered study assistant. Get instant Socratic AI tutoring and real teacher escalation — all in one place. Start free.",
      },
      {
        name: "keywords",
        content:
          "AI tutor, study assistant, AI tutoring Kenya, online study Kenya, AI education Africa, GilaniAI",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gilaniai.site/" },
      { property: "og:title", content: "GilaniAI — AI Study Assistant" },
      {
        property: "og:description",
        content:
          "Your AI-powered study assistant. Socratic tutoring and teacher escalation — free to start.",
      },
      { property: "og:image", content: "https://gilaniai.site/icon-512.png" },
      { property: "og:image:alt", content: "GilaniAI — Ethical AI Study Assistant" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "GilaniAI — AI Study Assistant" },
      {
        name: "twitter:description",
        content:
          "Your AI study assistant. Socratic tutoring and real teacher review — free to start.",
      },
      { name: "twitter:image", content: "https://gilaniai.site/icon-512.png" },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.site/" }],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  // True while a brand-new sign-up is mid-flow (e.g. still needs to submit
  // the display-name form). Supabase reports `user` as signed-in the
  // moment setSession() runs, which is BEFORE that form is filled out —
  // without this flag, this page would redirect away (or blank the modal
  // via the loader below) before the user ever saw the name-capture step.
  const [authInProgress, setAuthInProgress] = useState(false);

  useEffect(() => {
    if (!loading && user && !authInProgress) {
      if (roles.includes("admin")) {
        navigate({ to: "/admin/users" as any });
      } else if (roles.includes("teacher")) {
        navigate({ to: "/teacher/escalations" as any });
      } else {
        navigate({ to: "/tutor" as any });
      }
    }
  }, [user, roles, loading, authInProgress, navigate]);

  if (!authInProgress && user && !loading) {
    return <GilaniLoader />;
  }

  const closeAuthModal = () => {
    setAuthInProgress(false);
    navigate({ search: { authModalOpen: undefined } as any });
  };

  return (
    <main className="min-h-screen w-full bg-[#121212] text-white selection:bg-[#C96A3D] selection:text-white font-sans overflow-x-hidden">
      {search.authModalOpen && (
        <AuthModal
          onClose={closeAuthModal}
          onAuthStart={() => setAuthInProgress(true)}
          onAuthComplete={() => setAuthInProgress(false)}
        />
      )}
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <DemoSection />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
