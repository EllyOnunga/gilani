import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/client/supabase";
import { AuthForm } from "@/client/components/auth/AuthForm";
import { ArrowLeft } from "lucide-react";

function safeRedirectPath(url: string | undefined): string {
  if (!url) return "/tutor";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return "/tutor";
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: (s.redirect as string) || undefined,
    signout: s.signout === "true" || s.signout === true || undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (search.signout) {
      await supabase.auth.signOut();
      throw redirect({ to: "/login" as any });
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: safeRedirectPath(search.redirect) });
  },
  head: () => ({
    meta: [
      { title: "Sign in — GilaniAI" },
      {
        name: "description",
        content: "Sign in to your GilaniAI account to access AI tutoring and teacher escalation.",
      },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.site/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#121212] p-4 selection:bg-[#C96A3D] selection:text-white">
      <Link
        to="/"
        className="fixed top-4 left-4 z-10 inline-flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
        aria-label="Back to home"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back</span>
      </Link>
      <AuthForm />
    </main>
  );
}
