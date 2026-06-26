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
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Free Plan",
    description: "10 msgs, 2 quizzes, 2 planners, 3 uploads/day",
    price: 0,
    dailyMessages: 10,
    dailyTokens: 15_000,
    dailyQuizzes: 2,
    dailyPlanners: 2,
    dailyNotes: 3,
  },
  basic: {
    id: "basic",
    label: "Student Basic",
    description: "50 msgs, 10 quizzes, 10 planners, 15 uploads/day",
    price: 150,
    dailyMessages: 50,
    dailyTokens: 50_000,
    dailyQuizzes: 10,
    dailyPlanners: 10,
    dailyNotes: 15,
  },
  premium: {
    id: "premium",
    label: "Student Premium",
    description: "Unlimited messages, 50 quizzes, 30 planners, 50 uploads/day",
    price: 300,
    dailyMessages: 999_999,
    dailyTokens: 200_000,
    dailyQuizzes: 50,
    dailyPlanners: 30,
    dailyNotes: 50,
  },
  school: {
    id: "school",
    label: "School License",
    description: "Unlimited messages, 100 quizzes, 100 planners, 150 uploads/day",
    price: 5_000,
    dailyMessages: 999_999,
    dailyTokens: 999_999,
    dailyQuizzes: 100,
    dailyPlanners: 100,
    dailyNotes: 150,
  },
};

// Pay-as-you-go: KES 1 = 1,000 tokens, minimum KES 10
export const TOPUP_TOKENS_PER_KES = 1_000;
export const TOPUP_MIN_KES = 10;

export function getPlanLimits(plan: string): Plan {
  return PLANS[plan as PlanId] ?? PLANS.free;
}
