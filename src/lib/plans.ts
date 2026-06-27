export type PlanId = "free" | "basic" | "premium" | "school";

export interface Plan {
  id: PlanId;
  label: string;
  description: string;
  price: number; // KES
  dailyMessages: number;
  dailyTokens: number;
  dailyQuizzes: number;
  dailyPlanners: number;
  dailyNotes: number;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Free Plan",
    description: "10 AI tutor messages/day, Socratic guidance",
    price: 0,
    dailyMessages: 10,
    dailyTokens: 15_000,
    dailyQuizzes: 2,
    dailyPlanners: 2,
    dailyNotes: 3,
    features: [
      "10 Socratic AI tutor messages per day",
      "Socratic hints & step-by-step guidance",
      "Standard response speed",
      "Standard PDF & Word session exports",
    ],
  },
  basic: {
    id: "basic",
    label: "Student Basic",
    description: "50 AI tutor messages/day, faster response, human help",
    price: 150,
    dailyMessages: 50,
    dailyTokens: 50_000,
    dailyQuizzes: 10,
    dailyPlanners: 10,
    dailyNotes: 15,
    features: [
      "50 Socratic AI tutor messages per day (5x more!)",
      "Socratic hints & step-by-step guidance",
      "2x faster response speed",
      "Standard teacher escalation queue access",
      "Full PDF & Word session exports",
    ],
  },
  premium: {
    id: "premium",
    label: "Student Premium",
    description: "Unlimited messages, priority response & escalation",
    price: 300,
    dailyMessages: 999_999,
    dailyTokens: 200_000,
    dailyQuizzes: 50,
    dailyPlanners: 30,
    dailyNotes: 50,
    features: [
      "Unlimited Socratic AI tutor messages",
      "Socratic hints & step-by-step guidance",
      "Priority response speed (No wait times)",
      "Priority Teacher Escalation (Fastest reviews)",
      "Interactive learning dashboard & stats",
    ],
  },
  school: {
    id: "school",
    label: "School License",
    description: "Unlimited messages for all students, moderation dashboard",
    price: 5_000,
    dailyMessages: 999_999,
    dailyTokens: 999_999,
    dailyQuizzes: 100,
    dailyPlanners: 100,
    dailyNotes: 150,
    features: [
      "Unlimited messages & resources for all users",
      "Priority institutional response speed",
      "School teacher moderation dashboard access",
      "Advanced class analytics & progress monitoring",
      "Dedicated institutional support manager",
    ],
  },
};

// Pay-as-you-go: KES 1 = 1,000 tokens, minimum KES 10
export const TOPUP_TOKENS_PER_KES = 1_000;
export const TOPUP_MIN_KES = 10;

export const PLAN_MINUTE_LIMITS: Record<PlanId, number> = {
  free:    5,
  basic:   10,
  premium: 20,
  school:  20,
};

export function getPlanMinuteLimit(plan: string): number {
  return PLAN_MINUTE_LIMITS[plan as PlanId] ?? PLAN_MINUTE_LIMITS.free;
}

export function getPlanLimits(plan: string): Plan {
  return PLANS[plan as PlanId] ?? PLANS.free;
}
