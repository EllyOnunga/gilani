import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { supabase } from "@/integrations/supabase/client";
import { Settings, UserCheck, Loader2, Shield, GraduationCap, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  display_name: string | null;
  curriculum: string | null;
  created_at: string | null;
  role: string;
};

// ─── Server Functions ──────────────────────────────────────────────────────────

const listProfiles = createServerFn({ method: "GET" }).handler(async () => {
  // SECURITY: Check if user is admin via middleware
  // This route should only be accessible through the _authenticated layout which checks roles
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Not authenticated");
  }
  
  // SECURITY: Verify admin role before returning all profiles
  const { data: roleCheck } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .eq('role', 'admin')
    .single();
  
  if (!roleCheck) {
    throw new Error("Forbidden: Admin access required");
  }

  // Fetch profiles
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, curriculum, created_at")
    .order("created_at", { ascending: false });
  if (pErr) throw new Error(pErr.message);

  // Fetch roles
  const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
  const roleMap: Record<string, string> = {};
  for (const r of roles ?? []) roleMap[r.user_id] = r.role;

  return (profiles ?? []).map((p) => ({
    ...p,
    role: roleMap[p.id] ?? "student",
  })) as Profile[];
});

const updateRole = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string(), role: z.string() }))
  .handler(async ({ data }) => {
    const { userId, role } = data;
    
    // SECURITY: Check if user is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error("Unauthorized: Not authenticated");
    }
    
    const { data: roleCheck } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();
    
    if (!roleCheck) {
      throw new Error("Forbidden: Admin access required");
    }
    
    // SECURITY: Prevent self-demotion from admin
    if (session.user.id === userId && role !== "admin") {
      throw new Error("Cannot remove your own admin role");
    }
    
    // Upsert into user_roles
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: role as any }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Admin — Users & Roles — GilaniAI" }] }),
  beforeLoad: async () => {
    // SECURITY: Check admin role before allowing access
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    
    const { data: roleCheck } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();
    
    if (!roleCheck) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => listProfiles(),
  component: AdminUsersPage,
});

// ─── Component ─────────────────────────────────────────────────────────────────

const ROLES = ["student", "teacher", "admin"] as const;
type Role = (typeof ROLES)[number];

const ROLE_META: Record<Role, { icon: typeof User; color: string }> = {
  student: { icon: GraduationCap, color: "text-blue-600 bg-blue-50 border-blue-200" },
  teacher: { icon: UserCheck, color: "text-amber-600 bg-amber-50 border-amber-200" },
  admin: { icon: Shield, color: "text-red-600 bg-red-50 border-red-200" },
};

function AdminUsersPage() {
  const initial = Route.useLoaderData() as Profile[];
  const [profiles, setProfiles] = useState<Profile[]>(initial);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.display_name?.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q)
    );
  });

  const handleRoleChange = async (userId: string, role: string) => {
    setUpdating(userId);
    try {
      await updateRole({ data: { userId, role } });
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role } : p))
      );
      toast.success(`Role updated to ${role}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  const counts = ROLES.reduce((acc, r) => {
    acc[r] = profiles.filter((p) => p.role === r).length;
    return acc;
  }, {} as Record<Role, number>);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8 lg:p-12">
      {/* Header */}
      <header className="animate-in-slide">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          Admin Panel
        </p>
        <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Users &amp; Roles</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage accounts and assign student, teacher, or admin privileges.
        </p>
      </header>

      {/* Role counts */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {ROLES.map((r) => {
          const { icon: Icon, color } = ROLE_META[r];
          return (
            <div key={r} className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
              <Icon className={`mx-auto h-5 w-5 mb-2 ${color.split(" ")[0]}`} />
              <p className="font-serif text-3xl font-bold">{counts[r]}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1 capitalize">{r}s</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or role…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  User
                </th>
                <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Curriculum
                </th>
                <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Joined
                </th>
                <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center font-serif text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const meta = ROLE_META[p.role as Role] ?? ROLE_META.student;
                const isUpdating = updating === p.id;
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-semibold">{p.display_name ?? "—"}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">ID: {p.id.slice(0, 8)}…</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {p.curriculum ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString("en-KE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${meta.color}`}>
                          {p.role}
                        </span>
                        <div className="relative">
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <select
                              value={p.role}
                              onChange={(e) => handleRoleChange(p.id, e.target.value)}
                              className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                              title="Change role"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border/50 bg-muted/20">
          <p className="font-mono text-[10px] text-muted-foreground">
            {filtered.length} of {profiles.length} users
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <Settings className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Admin note:</strong> Role changes take effect immediately. Teachers gain access to the Escalations panel. Admins have full platform access.
        </p>
      </div>
    </div>
  );
}
