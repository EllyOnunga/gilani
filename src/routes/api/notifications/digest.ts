import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTransactionalEmail, weeklyDigestEmailTemplate } from "@/lib/email.server";

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.APP_URL || "https://gilaniai.site";

export const Route = createFileRoute("/api/notifications/digest")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const request = getRequest();

          // Verify caller is the cron scheduler (Vercel Cron or Supabase pg_net)
          const authHeader = request.headers.get("authorization");
          const cronHeader = request.headers.get("x-cron-secret");

          const isVercelCron = authHeader === `Bearer ${CRON_SECRET}`;
          const isSupabaseCron = cronHeader === CRON_SECRET;

          if (!CRON_SECRET || (!isVercelCron && !isSupabaseCron)) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Fetch all users with digest enabled
          // Cast to any to bypass strict TS checking for the unmigrated preferences column
          const { data: profiles, error: profilesError } = await (supabaseAdmin as any)
            .from("profiles")
            .select("id, display_name, preferences")
            .not("preferences", "is", null);

          if (profilesError) throw profilesError;

          const digestUsers = (profiles ?? []).filter(
            (p: any) => (p.preferences as any)?.notificationsDigest === true,
          );

          if (!digestUsers.length) {
            return new Response(JSON.stringify({ message: "No digest subscribers", sent: 0 }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Calculate the date range for the past 7 days
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - 7);
          weekStart.setHours(0, 0, 0, 0);

          const weekOf = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

          let sent = 0;
          let failed = 0;

          for (const profile of digestUsers) {
            try {
              // Fetch user email
              const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
              const email = authUser?.user?.email;
              if (!email) continue;

              // Gather stats for the past 7 days
              const [messagesResult, notesResult] = await Promise.all([
                supabaseAdmin
                  .from("messages")
                  .select("id, content", { count: "exact" })
                  .eq("user_id", profile.id)
                  .eq("role", "user")
                  .gte("created_at", weekStart.toISOString()),
                supabaseAdmin
                  .from("notes")
                  .select("id", { count: "exact" })
                  .eq("user_id", profile.id)
                  .gte("created_at", weekStart.toISOString()),
              ]);

              const messagesCount = messagesResult.count ?? 0;
              const notesCount = notesResult.count ?? 0;

              // Rough topic count = unique first words of user messages (heuristic)
              const messages = messagesResult.data ?? [];
              const topicsSet = new Set(
                messages
                  .map((m) => (m.content as string)?.split(" ").slice(0, 3).join(" ").toLowerCase())
                  .filter(Boolean),
              );
              const topicsCount = Math.min(topicsSet.size, messagesCount);

              const html = weeklyDigestEmailTemplate({
                studentName: profile.display_name || email.split("@")[0],
                weekOf,
                stats: {
                  messagesCount,
                  topicsCount,
                  quizzesCount: 0, // extend later when quiz tracking is fuller
                  notesCount,
                  streak: messagesCount >= 5 ? Math.ceil(messagesCount / 5) : 0,
                },
              });

              const ok = await sendTransactionalEmail({
                to: email,
                subject: `📚 Your weekly study digest — ${weekOf}`,
                html,
                fromEmail: "info@gilaniai.site",
                fromName: "GilaniAI",
              });

              if (ok) sent++;
              else failed++;

              // Log to notification_logs if table exists (best-effort)
              try {
                await (supabaseAdmin as any).from("notification_logs").insert({
                  user_id: profile.id,
                  type: "digest",
                  subject: `Weekly digest — ${weekOf}`,
                  status: ok ? "sent" : "failed",
                });
              } catch (e) {
                // Ignore if table doesn't exist
              }
            } catch (innerErr) {
              console.error(`[Digest] Failed for user ${profile.id}:`, innerErr);
              failed++;
            }
          }

          return new Response(
            JSON.stringify({ ok: true, sent, failed, total: digestUsers.length }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (error) {
          console.error("[API Digest] Error:", error);
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
