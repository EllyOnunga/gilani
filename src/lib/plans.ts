export type PlanId = "free" | "basic" | "premium" | "school";

export interface Plan {
  id: PlanId;
  label: string;
  description: string;
  price: number; // KES
  dailyMessages: number;
  dailyTokens: number;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Free Plan",
    description: "10 messages/day — Try it out",
    price: 0,
    dailyMessages: 10,
    dailyTokens: 15_000,
  },
  basic: {
    id: "basic",
    label: "Student Basic",
    description: "50 messages/day — Casual revision",
    price: 150,
    dailyMessages: 50,
    dailyTokens: 50_000,
  },
  premium: {
    id: "premium",
    label: "Student Premium",
    description: "Unlimited messages — Serious KCSE prep",
    price: 300,
    dailyMessages: 999_999,
    dailyTokens: 200_000,
  },
  school: {
    id: "school",
    label: "School License",
    description: "Unlimited — Up to 50 students",
    price: 5_000,
    dailyMessages: 999_999,
    dailyTokens: 999_999,
  },
};

export function getPlanLimits(plan: string): Plan {
  return PLANS[plan as PlanId] ?? PLANS.free;
}
