import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Eye, Save, Users, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TabStat {
  tab: string;
  views: number;
  saves: number;
}

interface RecentEvent {
  id: string;
  user_id: string;
  action: string;
  payload: any;
  created_at: string;
  user_display?: string;
}

const TAB_LABELS: Record<string, string> = {
  profile: "Profile Details",
  notifications: "Notifications",
  language: "Language & Region",
  tutor: "Tutor Preferences",
  accessibility: "Accessibility",
  shortcuts: "Keyboard Shortcuts",
  theme: "Display Theme",
  plan: "Plan & Usage",
  consent: "Consent & Security",
};

export function AdminSettingsAnalyticsTab() {
  const [tabStats, setTabStats] = useState<TabStat[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSaves, setTotalSaves] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Fetch all settings-related audit logs (last 90 days)
        const since = new Date();
        since.setDate(since.getDate() - 90);

        const { data: events } = await supabase
          .from("audit_logs")
          .select("id, user_id, action, payload, created_at")
          .like("action", "settings.%")
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false })
          .limit(500);

        if (!events) {
          setLoading(false);
          return;
        }

        // Aggregate tab views
        const viewMap: Record<string, number> = {};
        const saveMap: Record<string, number> = {};
        const userSet = new Set<string>();
        let saves = 0;
        let views = 0;

        for (const e of events) {
          if (e.user_id) userSet.add(e.user_id);
          const tab = (e.payload as any)?.tab ?? "unknown";
          if (e.action === "settings.tab_viewed") {
            viewMap[tab] = (viewMap[tab] ?? 0) + 1;
            views++;
          } else if (e.action === "settings.preferences_saved") {
            saveMap[tab] = (saveMap[tab] ?? 0) + 1;
            saves++;
          }
        }

        setTotalViews(views);
        setTotalSaves(saves);
        setUniqueUsers(userSet.size);

        // Build sorted tab stats
        const allTabs = new Set([...Object.keys(viewMap), ...Object.keys(saveMap)]);
        const stats: TabStat[] = Array.from(allTabs)
          .map((tab) => ({ tab, views: viewMap[tab] ?? 0, saves: saveMap[tab] ?? 0 }))
          .sort((a, b) => b.views - a.views);

        setTabStats(stats);
        setRecentEvents(events.slice(0, 20) as RecentEvent[]);
      } catch (err) {
        console.error("Failed to load settings analytics:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxViews = tabStats.length > 0 ? Math.max(...tabStats.map((t) => t.views), 1) : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Tab Views (90d)", value: totalViews, icon: Eye, color: "text-blue-500" },
          {
            label: "Preference Saves (90d)",
            value: totalSaves,
            icon: Save,
            color: "text-emerald-500",
          },
          { label: "Unique Users", value: uniqueUsers, icon: Users, color: "text-primary" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border/40 bg-card p-5 flex items-center gap-4"
          >
            <div className={`rounded-xl bg-muted/40 p-3 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Visit Breakdown */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="font-serif text-base font-bold text-foreground">
            Settings Tab Popularity
          </h3>
        </div>
        {tabStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No data yet. Events will appear as users access Settings.
          </p>
        ) : (
          <div className="space-y-3">
            {tabStats.map((s) => (
              <div key={s.tab} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {TAB_LABELS[s.tab] ?? s.tab}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    <span className="text-blue-500">{s.views} views</span>
                    {s.saves > 0 && (
                      <span className="ml-2 text-emerald-500">· {s.saves} saves</span>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full transition-all duration-700"
                    style={{ width: `${(s.views / maxViews) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Events Feed */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-serif text-base font-bold text-foreground">
            Recent Settings Activity
          </h3>
        </div>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recent events.</p>
        ) : (
          <div className="divide-y divide-border/30">
            {recentEvents.map((e) => (
              <div key={e.id} className="flex items-start justify-between py-2.5 gap-4 text-xs">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider font-bold ${
                        e.action === "settings.tab_viewed"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {e.action === "settings.tab_viewed" ? "Viewed" : "Saved"}
                    </span>
                    <span className="font-semibold text-foreground">
                      {TAB_LABELS[(e.payload as any)?.tab] ?? (e.payload as any)?.tab ?? "–"}
                    </span>
                  </div>
                  <p className="text-muted-foreground font-mono">User: {e.user_id?.slice(0, 8)}…</p>
                </div>
                <time className="text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {new Date(e.created_at).toLocaleString()}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed">
        <TrendingUp className="h-3.5 w-3.5 inline mr-1.5" />
        Events are logged anonymously whenever a user opens a settings tab or saves preferences.
        Data covers the last 90 days. Individual preference values are <strong>not</strong> stored —
        only the tab name is recorded.
      </div>
    </div>
  );
}
