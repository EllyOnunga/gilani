// ─── Shared admin types ────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  curriculum: string | null;
  created_at: string | null;
  role: string;
  plan: string;
  plan_expiry: string | null;
  conversation_count?: number;
};

export type Escalation = {
  id: string;
  conversation_id: string;
  user_id: string;
  reason: string;
  status: string;
  detail: string | null;
  reviewer_id: string | null;
  created_at: string;
  profiles?: { display_name: string | null; email: string | null } | null;
};

export type PlatformStats = {
  totalConversations: number;
  totalMessages: number;
  totalNotes: number;
  totalEscalations: number;
  openEscalations: number;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  category: string;
  message: string;
  status: string;
  created_at: string;
};

export type MessageFeedback = {
  id: string;
  message_id: string;
  user_id: string;
  vote: number;
  created_at: string;
  profiles?: { display_name: string | null } | null;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
};

export type RateLimitRow = {
  key: string;
  count: number;
  reset_at: string;
};

export type Payment = {
  id: string;
  user_id: string;
  phone_number: string;
  amount: number;
  plan: string;
  mpesa_receipt: string | null;
  status: string;
  created_at: string;
  profiles?: { display_name: string | null; email: string | null } | null;
};

export type AdminTab =
  | "users"
  | "feedback"
  | "messages"
  | "ratelimits"
  | "subscriptions"
  | "escalations"
  | "newsletter"
  | "globalnotes";

// ─── Shared helpers ─────────────────────────────────────────────────────────────

export const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
};

export const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const ROLES = ["student", "teacher", "admin"] as const;
export type Role = (typeof ROLES)[number];

import { GraduationCap, Shield, User, UserCheck } from "lucide-react";
export const ROLE_META: Record<Role, { icon: typeof User; color: string }> = {
  student: { icon: GraduationCap, color: "text-blue-600 border-blue-200" },
  teacher: { icon: UserCheck, color: "text-amber-600 border-amber-200" },
  admin: { icon: Shield, color: "text-red-600 border-red-200" },
};

export const STATUS_META: Record<string, { label: string; color: string }> = {
  unread: { label: "Unread", color: "text-blue-600 border-blue-200" },
  read: { label: "Read", color: "text-amber-600 border-amber-200" },
  resolved: { label: "Resolved", color: "text-green-600 border-green-200" },
};
