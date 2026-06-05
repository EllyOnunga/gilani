import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/async";

export type AppRole = "student" | "teacher" | "admin";

export interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkAndAssignRole = async (userId: string): Promise<AppRole[]> => {
      try {
        // Read pending role if stored during register page submit or OAuth redirect
        const pendingRole = typeof window !== "undefined" ? localStorage.getItem("pending_role") : null;

        if (pendingRole && (pendingRole === "student" || pendingRole === "teacher")) {
          localStorage.removeItem("pending_role");
          const { assignUserRole } = await import("@/lib/auth-actions");
          await assignUserRole({ data: { userId, role: pendingRole as AppRole } });
          return [pendingRole as AppRole];
        }

        const { data: r } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        if (r && r.length > 0) {
          return r.map((x) => x.role as AppRole);
        }
        // Auto-assign student role
        const { assignUserRole } = await import("@/lib/auth-actions");
        await assignUserRole({ data: { userId, role: "student" } });
        return ["student"];
      } catch (err) {
        console.error("[checkAndAssignRole] failed:", err);
        return [];
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        checkAndAssignRole(s.user.id).then((userRoles) => {
          if (active) {
            setRoles(userRoles);
            setLoading(false);
          }
        });
      } else {
        setRoles([]);
        setLoading(false);
      }
    });


    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          try {
            const userRoles = await checkAndAssignRole(data.session.user.id);
            if (active) {
              setRoles(userRoles);
            }
          } catch {
            // roles fetch failed, continue without roles
          } finally {
            if (active) setLoading(false);
          }
        } else {
          if (active) setLoading(false);
        }
      })
      .catch((e) => {
        console.error("getSession error:", e);
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, roles, loading };
}
