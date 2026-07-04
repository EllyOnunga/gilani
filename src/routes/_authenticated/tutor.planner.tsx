import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GilaniLoader } from "@/components/GilaniLoader";
import { Calendar as CalendarIcon, CheckCircle2, Circle, Clock, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { TutorPageHeader } from "@/components/tutor/TutorPageHeader";
import { MarkdownRenderer } from "@/components/tutor/MarkdownRenderer";

export const Route = createFileRoute("/_authenticated/tutor/planner")({
  component: PlannerRoute,
});

function PlannerRoute() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchPlans = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("study_plans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (mounted) setPlans(data || []);
      } catch (err: any) {
        toast.error(err.message || "Failed to load study plans");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPlans();
    return () => { mounted = false; };
  }, []);

  if (loading) return (
    <div className="h-full flex flex-col">
      <TutorPageHeader title="Study Planner" subtitle="Organize your sessions and track goals" />
      <div className="flex-1 flex items-center justify-center"><GilaniLoader /></div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <TutorPageHeader
        title="Study Planner"
        subtitle={plans.length > 0 ? `${plans.length} active plan${plans.length !== 1 ? "s" : ""}` : "Organize your goals"}
        actions={
          <button
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            onClick={() => toast.info("Ask GilaniAI to 'create a study plan for me' in chat!")}
          >
            <Plus className="h-4 w-4" />
            New Plan
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-4">

          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20 mt-8">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Your planner is empty</h3>
              <p className="text-muted-foreground max-w-sm">
                Ask GilaniAI to{" "}
                <span className="text-primary font-medium">"create a study plan for me"</span>{" "}
                and it will appear here automatically!
              </p>
            </div>
          ) : (
            plans.map((plan) => {
              const isOpen = expanded === plan.id;
              const completedCount = Array.isArray(plan.goals)
                ? plan.goals.filter((g: any) => g.completed).length
                : 0;
              const totalCount = Array.isArray(plan.goals) ? plan.goals.length : 0;

              return (
                <div key={plan.id} className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden hover:border-primary/40 transition-colors">
                  <button
                    onClick={() => setExpanded(isOpen ? null : plan.id)}
                    className="w-full flex items-center gap-3 p-5 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground">{plan.title || "Untitled Plan"}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${
                          plan.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {plan.status || "active"}
                        </span>
                        {totalCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {completedCount}/{totalCount} tasks
                          </span>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{plan.description}</p>
                      )}
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-border/50 space-y-4">
                      {/* Markdown description if available */}
                      {plan.description && (
                        <div className="markdown-content text-sm text-foreground">
                          <MarkdownRenderer content={plan.description} />
                        </div>
                      )}

                      {/* Goals checklist */}
                      {Array.isArray(plan.goals) && plan.goals.length > 0 && (
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Goals</h4>
                          {plan.goals.map((goal: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3">
                              {goal.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                              )}
                              <div className="min-w-0">
                                <p className={`text-sm ${goal.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                  {goal.task || goal.title || String(goal)}
                                </p>
                                {goal.dueDate && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Clock className="h-3 w-3" />
                                    {new Date(goal.dueDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
