import { Loader2, Search, Settings, GraduationCap } from "lucide-react";
import type { Profile, Role } from "@/components/admin/types";
import { ROLES, ROLE_META, formatDate } from "@/components/admin/types";
import { PLANS } from "@/lib/plans";

type Props = {
  filtered: Profile[];
  profileState: Profile[];
  search: string;
  setSearch: (v: string) => void;
  updating: string | null;
  counts: Record<Role, number>;
  handleRoleChange: (userId: string, role: string) => void;
};

export function AdminUsersTab({
  filtered,
  profileState,
  search,
  setSearch,
  updating,
  counts,
  handleRoleChange,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        {ROLES.map((r) => {
          const { icon: Icon, color } = ROLE_META[r];
          return (
            <div
              key={r}
              className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm text-center"
            >
              <Icon className={`mx-auto h-5 w-5 mb-2 ${color.split(" ")[0]}`} />
              <p className="font-serif text-2xl sm:text-3xl font-bold">{counts[r]}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1 capitalize">
                {r}s
              </p>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or role…"
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["User", "Email", "Conversations", "Curriculum", "Joined", "Role"].map((h) => (
                  <th
                    key={h}
                    className="px-2 py-2 sm:px-5 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center font-serif text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const meta = ROLE_META[p.role as Role] ?? ROLE_META.student;
                const isUpdating = updating === p.id;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-2 py-2 sm:px-5 sm:py-3">
                      <p className="font-semibold">{p.display_name ?? "—"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        ID: {p.id?.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                      {p.email ?? "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-center">
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 px-2 py-0.5 text-blue-700 text-[10px] font-mono">
                        {p.conversation_count ?? 0}
                      </span>
                    </td>
                    <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                      {p.plan ?? "—"}
                    </td>
                    <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-2 py-2 sm:px-5 sm:py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${meta.color}`}
                        >
                          {p.role}
                        </span>
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <select
                            value={p.role}
                            onChange={(e) => handleRoleChange(p.id, e.target.value)}
                            className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        )}
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
            {filtered.length} of {profileState.length} users
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <Settings className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Admin note:</strong> Role changes take effect immediately. Teachers gain access to
          the Escalations panel. Admins have full platform access.
        </p>
      </div>
    </>
  );
}
