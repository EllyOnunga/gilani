import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Calculates a user's exact current consecutive study streak (days of activity)
 * and active stats by querying quiz_attempts, messages, and notes.
 */
export async function calculateUserStreakAndStats(userId: string) {
  try {
    // Fetch all activity timestamps from Supabase
    const [quizzesRes, messagesRes, notesRes] = await Promise.all([
      supabaseAdmin.from("quiz_attempts").select("created_at").eq("user_id", userId),
      supabaseAdmin.from("messages").select("created_at").eq("user_id", userId),
      supabaseAdmin.from("notes").select("created_at").eq("user_id", userId),
    ]);

    const activeDates = new Set<string>();

    const addTimestamp = (createdAt: string | null | undefined) => {
      if (!createdAt) return;
      // Convert to ISO date YYYY-MM-DD in UTC (or simple local slice)
      const dateStr = new Date(createdAt).toISOString().split("T")[0];
      activeDates.add(dateStr);
    };

    quizzesRes.data?.forEach((q) => addTimestamp(q.created_at));
    messagesRes.data?.forEach((m) => addTimestamp(m.created_at));
    notesRes.data?.forEach((n) => addTimestamp(n.created_at));

    // Sort unique dates descending (latest first)
    const sortedDates = Array.from(activeDates).sort((a, b) => b.localeCompare(a));

    let streak = 0;
    if (sortedDates.length > 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // A streak is active if the latest activity is either today or yesterday
      const latestDateStr = sortedDates[0];
      if (latestDateStr === todayStr || latestDateStr === yesterdayStr) {
        streak = 1;
        let currentDate = new Date(latestDateStr);

        for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = prevDate.toISOString().split("T")[0];

          if (sortedDates[i] === prevDateStr) {
            streak++;
            currentDate = prevDate;
          } else {
            // Consecutive streak broken
            break;
          }
        }
      }
    }

    return {
      streak,
      notesCount: notesRes.data?.length ?? 0,
      quizzesCount: quizzesRes.data?.length ?? 0,
    };
  } catch (err) {
    console.error("[calculateUserStreakAndStats] error:", err);
    return {
      streak: 0,
      notesCount: 0,
      quizzesCount: 0,
    };
  }
}
