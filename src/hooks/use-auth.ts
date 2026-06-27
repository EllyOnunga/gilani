import { useEffect, useState, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

  // Keep refs of user/session to avoid stale closures in auth subscription callbacks
  const userRef = useRef<User | null>(null);
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    let active = true;

    const checkAndAssignRole = async (userId: string, isNewSignIn = false): Promise<AppRole[]> => {
      try {
        // Check for pending role from OAuth redirect — only on fresh sign in
        if (isNewSignIn) {
          const pendingRole =
            typeof window !== "undefined" ? localStorage.getItem("pending_role") : null;
          if (pendingRole && ["student", "teacher"].includes(pendingRole)) {
            // Check if role already assigned before trying to assign
            const { data: existing } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", userId);
            if (!existing || existing.length === 0) {
              try {
                localStorage.removeItem("pending_role");
                const { assignUserRole } = await import("@/lib/auth-actions.server-fns");
                await assignUserRole({ data: { role: pendingRole as AppRole } });
                return [pendingRole as AppRole];
              } catch {
                // Role already assigned by trigger, continue
              }
            } else {
              localStorage.removeItem("pending_role");
              return existing.map((x) => x.role as AppRole);
            }
          }
        }

        // Fetch existing roles
        const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", userId);

        if (r && r.length > 0) {
          return r.map((x) => x.role as AppRole);
        }

        // No role found — trigger should have assigned student, return empty and let UI handle
        return [];
      } catch (err) {
        console.error("[checkAndAssignRole] failed:", err);
        return [];
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return;

      const hasExistingUser = !!userRef.current;

      setSession(s);
      setUser(s?.user ?? null);
      sessionRef.current = s;
      userRef.current = s?.user ?? null;

      if (s?.user) {
        // Prevent loading spinner (and subsequent component unmounting) if the user is already logged in
        if (event === "SIGNED_IN" && !hasExistingUser) {
          setLoading(true);
        }
        // Only treat SIGNED_IN as a fresh sign in (OAuth callback lands here)
        const isNewSignIn = event === "SIGNED_IN";
        checkAndAssignRole(s.user.id, isNewSignIn).then((userRoles) => {
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
        sessionRef.current = data.session;
        userRef.current = data.session?.user ?? null;
        if (data.session?.user) {
          try {
            // On page load, don't treat as fresh sign in
            const userRoles = await checkAndAssignRole(data.session.user.id, false);
            if (active) setRoles(userRoles);
          } catch {
            // roles fetch failed
          } finally {
            if (active) setLoading(false);
          }
        } else {
          if (active) setLoading(false);
        }
      })
      .catch((e) => {
        console.error("getSession error:", e);
        if (!active) setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, roles, loading };
}
