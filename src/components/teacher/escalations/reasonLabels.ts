export const REASON_LABELS: Record<string, { label: string; color: string }> = {
  distress_keyword: {
    label: "Distress keyword",
    color: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-900",
  },
  student_request: {
    label: "Student request",
    color: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  },
  low_confidence: {
    label: "Low confidence",
    color: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  },
};
