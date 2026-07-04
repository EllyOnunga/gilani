export type PlanId = "free" | "pro";

export interface Plan {
  id: PlanId;
  label: string;
  description: string;
  price: number; // KES
  dailyMessages: number;
  dailyQuizzes: number;
  dailyPlanners: number;
  dailyNotes: number;
  maxQuizQuestions: number;
  quizDifficulties: string[];
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Free Plan",
    description: "50 AI tutor messages/day, Socratic guidance",
    price: 0,
    dailyMessages: 50,
    dailyQuizzes: 0,
    dailyPlanners: 0,
    dailyNotes: 0,
    maxQuizQuestions: 5,
    quizDifficulties: ["easy", "medium"],
    features: [
      "50 Socratic AI tutor messages per day",
      "Socratic hints & step-by-step guidance",
      "Standard response speed",
      "Standard PDF & Word session exports",
    ],
  },
  pro: {
    id: "pro",
    label: "Pro Plan",
    description: "Unlimited messages, quizzes, planner, and notes",
    price: 1000,
    dailyMessages: 999_999,
    dailyQuizzes: 999_999,
    dailyPlanners: 999_999,
    dailyNotes: 999_999,
    maxQuizQuestions: 15,
    quizDifficulties: ["easy", "medium", "hard", "mixed"],
    features: [
      "Unlimited AI tutor messages",
      "Unlimited Quiz generation",
      "Unlimited Study Planners",
      "Unlimited Notes upload & analysis",
      "Priority response speed",
      "Interactive learning dashboard & stats",
    ],
  },
};

// Pay-as-you-go: KES 1 = 1,000 tokens, minimum KES 10
export const TOPUP_TOKENS_PER_KES = 1_000;
export const TOPUP_MIN_KES = 10;

export const PLAN_MINUTE_LIMITS: Record<PlanId, number> = {
  free: 5,
  pro: 20,
};

export function getPlanMinuteLimit(plan: string): number {
  return PLAN_MINUTE_LIMITS[plan as PlanId] ?? PLAN_MINUTE_LIMITS.free;
}

export function getPlanLimits(plan: string): Plan {
  return PLANS[plan as PlanId] ?? PLANS.free;
}
