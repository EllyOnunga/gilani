import { createFileRoute } from "@tanstack/react-router";
import { QuizzesPage } from "@/components/QuizzesPage";

// Allow the server function up to 120 seconds to run (Vercel Pro / equivalent)
export const maxDuration = 120;

export const Route = createFileRoute("/_authenticated/quizzes")({
  head: () => ({
    meta: [
      { title: "Practice Quizzes — GilaniAI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    topic: (search.topic as string) || "",
  }),
  component: () => {
    const { topic } = Route.useSearch();
    return <QuizzesPage topicFromUrl={topic} />;
  },
});