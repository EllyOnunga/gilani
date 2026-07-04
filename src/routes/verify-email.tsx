import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { Logo } from "@/components/ui/logo";
import { CheckCircle2, XCircle } from "lucide-react";

const consumeVerifyToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email_verify_token", data.token)
      .maybeSingle();

    if (!profile) return { success: false };

    // Intentionally keep email_verify_token in place — this verification is
    // informational only and never gates access, so it's safe (and necessary)
    // to make the link idempotent. Nulling it caused false "expired" screens
    // when a link was opened twice (e.g. corporate email link-scanners).
    await supabaseAdmin
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", profile.id);

    return { success: true };
  });

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: (s.token as string) || "",
  }),
  loader: async ({ location }) => {
    const search = location.search as { token?: string };
    if (!search.token) return { success: false };
    return consumeVerifyToken({ data: { token: search.token } });
  },
  head: () => ({
    meta: [
      { title: "Verify Email — GilaniAI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { success } = Route.useLoaderData();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-[#e2e4f0] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/8 bg-[#1a1d27] shadow-2xl p-8 sm:p-10 space-y-6 text-center">
        <Logo to="/" size="md" className="mx-auto" />
        {success ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h1 className="font-serif text-2xl font-black text-white">Email verified</h1>
            <p className="text-sm text-[#9ca3af]">
              Your email is confirmed. You're all set — this didn't change your access, it just secures your account.
            </p>
          </>
        ) : (
          <>
            <XCircle className="h-12 w-12 text-[#d9531e] mx-auto" />
            <h1 className="font-serif text-2xl font-black text-white">Link expired or invalid</h1>
            <p className="text-sm text-[#9ca3af]">
              This verification link is no longer valid. Your account still works normally.
            </p>
          </>
        )}
        <Link
          to="/tutor"
          className="inline-block w-full rounded-xl bg-[#d9531e] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#c44819] transition-all"
        >
          Go to GilaniAI
        </Link>
      </div>
    </div>
  );
}
