import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GilaniLoader } from "@/components/GilaniLoader";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  Trash2,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { TutorPageHeader } from "@/components/tutor/TutorPageHeader";
import { MarkdownRenderer } from "@/components/tutor/MarkdownRenderer";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  generateStudyPlanFn,
  toggleStudyPlanItemFn,
  deleteStudyPlanFn,
  getPlannerFormOptionsFn,
  type StudyPlanItem,
} from "@/lib/planner.server-fns";
import { PomodoroTimer } from "@/components/tutor/PomodoroTimer";
import { Timer, Brain, LayoutList, LayoutGrid } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PlannerWeekView } from "@/components/tutor/planner/PlannerWeekView";

export const Route = createFileRoute("/_authenticated/tutor/planner")({
  component: PlannerRoute,
});

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-amber-500/10 text-amber-500",
  low: "bg-muted text-muted-foreground",
};

function groupByDate(items: StudyPlanItem[]): Record<string, StudyPlanItem[]> {
  return items.reduce((acc: Record<string, StudyPlanItem[]>, item) => {
    (acc[item.date] ??= []).push(item);
    return acc;
  }, {});
}

function PlannerRoute() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examDateObj, setExamDateObj] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [subjects, setSubjects] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [formOptions, setFormOptions] = useState<{
    plannersUsedToday: number;
    plannersMaxToday: number;
    weakTopics: string[];
  } | null>(null);
  const [activeTask, setActiveTask] = useState<{ planId: string; itemId: string } | null>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "week">("list");

  const fetchPlans = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("study_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPlans(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load study plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    (async () => {
      try {
        const opts = await getPlannerFormOptionsFn();
        setFormOptions(opts as any);
      } catch (err) {
        console.error("Failed to load planner options:", err);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    if (!examName.trim()) return toast.error("Please enter an exam or goal name.");
    if (!subjects.trim()) return toast.error("Please list the subjects/topics to cover.");
    setGenerating(true);
    try {
      await generateStudyPlanFn({
        data: {
          examName: examName.trim(),
          examDate: examDate || undefined,
          subjects: subjects.trim(),
          hoursPerDay,
        },
      } as any);
      toast.success("Study plan ready!");
      setShowForm(false);
      setExamName("");
      setExamDate("");
      setExamDateObj(undefined);
      setSubjects("");
      await fetchPlans();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate study plan");
    } finally {
      setGenerating(false);
    }
  };

  const startFocusSession = (planId: string, itemId: string, durationMinutes: number) => {
    setActiveTask({ planId, itemId });
    setTimerOpen(true);
  };

  const handleStudyComplete = async () => {
    if (!activeTask) return;
    const { planId, itemId } = activeTask;
    const plan = plans.find((p) => p.id === planId);
    const item = plan?.items?.find((it: StudyPlanItem) => it.id === itemId);
    if (item && !item.completed) {
      await handleToggleItem(planId, itemId);
      toast.success("Focus session complete — task marked done!", {
        action: { label: "Undo", onClick: () => handleToggleItem(planId, itemId) },
      });
    }
  };

  const handleToggleItem = async (planId: string, itemId: string) => {
    // Optimistic update
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              items: (p.items as StudyPlanItem[]).map((it) =>
                it.id === itemId ? { ...it, completed: !it.completed } : it,
              ),
            }
          : p,
      ),
    );
    try {
      await toggleStudyPlanItemFn({ data: { planId, itemId } } as any);
    } catch (err: any) {
      toast.error("Failed to update task — reverting.");
      fetchPlans();
    }
  };

  const handleDeletePlan = async (planId: string) => {
    setDeletingId(planId);
    setConfirmDeleteId(null);
    try {
      await deleteStudyPlanFn({ data: { planId } } as any);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      toast.success("Plan deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete plan");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading)
    return (
      <div className="h-full flex flex-col">
        <TutorPageHeader title="Study Planner" subtitle="Organize your sessions and track goals" />
        <div className="flex-1 flex items-center justify-center">
          <GilaniLoader />
        </div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-background">
      <TutorPageHeader
        title="Study Planner"
        subtitle={
          plans.length > 0
            ? `${plans.length} plan${plans.length !== 1 ? "s" : ""}`
            : "Organize your goals"
        }
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            New Plan
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {showForm && (
            <div className="border border-border bg-card rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    New Study Plan
                  </h3>
                  {formOptions && formOptions.plannersMaxToday < 999_999 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formOptions.plannersUsedToday}/{formOptions.plannersMaxToday} plans generated
                      today
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Exam or goal name
                </label>
                <input
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. KCSE Mathematics Mock, Term 2 Biology CAT"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Exam date{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional — leave blank for a general 14-day plan)
                  </span>
                </label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary/40 hover:border-primary/40 transition-colors"
                    >
                      <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={examDateObj ? "text-foreground" : "text-muted-foreground"}>
                        {examDateObj ? format(examDateObj, "PPP") : "Pick a date"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={examDateObj}
                      onSelect={(date) => {
                        setExamDateObj(date);
                        setExamDate(date ? format(date, "yyyy-MM-dd") : "");
                        setDatePickerOpen(false);
                      }}
                      disabled={{ before: new Date() }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Subjects / topics to cover
                </label>
                <textarea
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  placeholder="e.g. Algebra, Trigonometry, Cell Biology, Genetics"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Hours available per day:{" "}
                  <span className="text-primary font-semibold">{hoursPerDay}h</span>
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {formOptions && formOptions.weakTopics.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 mb-1.5">
                    <Brain className="h-3.5 w-3.5" />
                    Based on your recent quizzes, you're struggling with:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {formOptions.weakTopics.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Your plan will automatically prioritize extra time on these.
                  </p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {generating ? (
                  "Building your schedule..."
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Plan
                  </>
                )}
              </button>
            </div>
          )}

          {plans.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20 mt-8">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Your planner is empty</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Generate an AI study plan tailored to your exam date and subjects.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-medium hover:bg-primary/20 transition-colors"
              >
                Create a Study Plan
              </button>
            </div>
          ) : (
            plans.map((plan) => {
              const isOpen = expanded === plan.id;
              const items: StudyPlanItem[] = Array.isArray(plan.items) ? plan.items : [];
              const completedCount = items.filter((it) => it.completed).length;
              const totalCount = items.length;
              const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
              const grouped = groupByDate(items);
              const sortedDates = Object.keys(grouped).sort();

              return (
                <div
                  key={plan.id}
                  className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden hover:border-primary/40 transition-colors"
                >
                  <div
                    onClick={() => setExpanded(isOpen ? null : plan.id)}
                    className="w-full flex items-center gap-3 p-5 text-left cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <h3 className="font-semibold text-foreground">{plan.exam_name}</h3>
                        {plan.exam_date && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            {new Date(plan.exam_date).toLocaleDateString()}
                          </span>
                        )}
                        {totalCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {completedCount}/{totalCount} tasks
                          </span>
                        )}
                      </div>
                      {totalCount > 0 && (
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden max-w-xs">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(plan.id);
                      }}
                      disabled={deletingId === plan.id}
                      className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 disabled:opacity-40"
                      title="Delete plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-border/50 space-y-5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewMode("list")}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                            viewMode === "list"
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <LayoutList className="h-3 w-3" />
                          List
                        </button>
                        <button
                          onClick={() => setViewMode("week")}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                            viewMode === "week"
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <LayoutGrid className="h-3 w-3" />
                          Week
                        </button>
                      </div>
                      {viewMode === "week" ? (
                        <PlannerWeekView
                          key={plan.id}
                          items={items}
                          onToggleItem={(itemId) => handleToggleItem(plan.id, itemId)}
                          onStartFocus={(itemId, duration) =>
                            startFocusSession(plan.id, itemId, duration)
                          }
                        />
                      ) : (
                        <>
                          {sortedDates.map((date) => (
                            <div key={date} className="space-y-2.5">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </h4>
                              {grouped[date].map((item) => (
                                <div key={item.id} className="flex items-start gap-3">
                                  <button
                                    onClick={() => handleToggleItem(plan.id, item.id)}
                                    className="shrink-0 mt-0.5"
                                  >
                                    {item.completed ? (
                                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                                    )}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                      <span className="text-xs font-semibold text-primary">
                                        {item.subject}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        · {item.topic}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide flex items-center gap-1 ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.low}`}
                                      >
                                        <Flag className="h-2.5 w-2.5" />
                                        {item.priority}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {item.durationMinutes}m
                                      </span>
                                      {!item.completed && (
                                        <button
                                          onClick={() =>
                                            startFocusSession(
                                              plan.id,
                                              item.id,
                                              item.durationMinutes,
                                            )
                                          }
                                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                          title="Start a focus session for this task"
                                        >
                                          <Timer className="h-2.5 w-2.5" />
                                          Focus
                                        </button>
                                      )}
                                    </div>
                                    <div
                                      className={`text-sm prose prose-sm max-w-none [&>p]:m-0 ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}
                                    >
                                      <MarkdownRenderer content={item.task} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      <PomodoroTimer
        open={timerOpen}
        onOpenChange={setTimerOpen}
        showTrigger={false}
        initialMinutes={
          activeTask
            ? plans
                .find((p) => p.id === activeTask.planId)
                ?.items?.find((it: StudyPlanItem) => it.id === activeTask.itemId)?.durationMinutes
            : undefined
        }
        onStudyComplete={handleStudyComplete}
      />

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete this study plan?"
          description="This will permanently remove the plan and all its tasks, including completion history. This can't be undone."
          confirmLabel="Delete"
          busy={deletingId === confirmDeleteId}
          onConfirm={() => handleDeletePlan(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
