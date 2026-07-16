import { useState, useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  format,
  parseISO,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Flag, Timer } from "lucide-react";
import { MarkdownRenderer } from "@/client/components/tutor/MarkdownRenderer";
import type { StudyPlanItem } from "@/fns/planner.server-fns";

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-amber-500/10 text-amber-500",
  low: "bg-muted text-muted-foreground",
};

interface PlannerWeekViewProps {
  items: StudyPlanItem[];
  onToggleItem: (itemId: string) => void;
  onStartFocus: (itemId: string, durationMinutes: number) => void;
}

export function PlannerWeekView({ items, onToggleItem, onStartFocus }: PlannerWeekViewProps) {
  // Start on the week containing the plan's earliest task, not necessarily "today" —
  // a plan generated for a future exam shouldn't open on an empty current week.
  const initialAnchor = useMemo(() => {
    if (!items.length) return new Date();
    const earliest = items.reduce((min, it) => (it.date < min ? it.date : min), items[0].date);
    return parseISO(earliest);
  }, [items]);

  const [anchor, setAnchor] = useState(initialAnchor);

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const itemsByDate = useMemo(() => {
    const map: Record<string, StudyPlanItem[]> = {};
    for (const it of items) {
      (map[it.date] ??= []).push(it);
    }
    return map;
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setAnchor((d) => subWeeks(d, 1))}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-xs font-semibold text-foreground">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </p>
        <button
          onClick={() => setAnchor((d) => addWeeks(d, 1))}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayItems = itemsByDate[dateKey] ?? [];
          const today = isToday(day);

          return (
            <div
              key={dateKey}
              className={`shrink-0 w-[180px] rounded-xl border p-2.5 space-y-2 ${
                today ? "border-primary/50 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="text-center">
                <p
                  className={`text-[10px] font-semibold uppercase tracking-wider ${today ? "text-primary" : "text-muted-foreground"}`}
                >
                  {format(day, "EEE")}
                </p>
                <p className={`text-sm font-bold ${today ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d")}
                </p>
              </div>

              {dayItems.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50 text-center italic py-2">
                  Free day
                </p>
              ) : (
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className="border-t border-border/40 pt-2 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-start gap-1.5">
                        <button onClick={() => onToggleItem(item.id)} className="shrink-0 mt-0.5">
                          {item.completed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-primary truncate">
                            {item.subject}
                          </p>
                          <div
                            className={`text-[11px] leading-snug [&>p]:m-0 ${
                              item.completed
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            }`}
                          >
                            <MarkdownRenderer content={item.task} />
                          </div>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <span
                              className={`px-1 py-0.5 rounded text-[8px] font-medium uppercase tracking-wide flex items-center gap-0.5 ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.low}`}
                            >
                              <Flag className="h-2 w-2" />
                              {item.priority}
                            </span>
                            <span className="text-[8px] text-muted-foreground">
                              {item.durationMinutes}m
                            </span>
                            {!item.completed && (
                              <button
                                onClick={() => onStartFocus(item.id, item.durationMinutes)}
                                className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                title="Start a focus session"
                              >
                                <Timer className="h-2 w-2" />
                                Focus
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
