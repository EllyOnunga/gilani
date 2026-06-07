import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  tutor: "Tutor Chat",
  notes: "Study Notes",
  quizzes: "Practice Quizzes",
  planner: "Planner",
  analytics: "Analytics",
  settings: "Settings",
  teacher: "Teacher",
  escalations: "Escalations",
  admin: "Admin",
  users: "Users & Roles",
};

type Crumb = {
  label: string;
  href: string;
};

function getCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: Crumb[] = [{ label: "Home", href: "/dashboard" }];

  let accumulated = "";
  for (const segment of segments) {
    accumulated += `/${segment}`;

    // Skip UUIDs — show as "Session" instead
    const isUuid = /^[0-9a-f-]{36}$/i.test(segment);
    const label = isUuid
      ? "Session"
      : ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);

    crumbs.push({ label, href: accumulated });
  }

  // Remove duplicate if first crumb after Home is also Dashboard
  if (crumbs.length > 1 && crumbs[1].href === "/dashboard") {
    return crumbs.slice(1);
  }

  return crumbs;
}

export function Breadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = getCrumbs(pathname);

  // Don't show breadcrumb on dashboard root
  if (pathname === "/dashboard" || crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 px-4 sm:px-6 py-2.5 border-b border-border/50 bg-background/60 backdrop-blur-sm text-xs text-muted-foreground overflow-x-auto"
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1 whitespace-nowrap">
            {i === 0 && <Home className="h-3 w-3 flex-shrink-0" />}
            {isLast ? (
              <span className="font-semibold text-foreground">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.href as any}
                className="hover:text-foreground transition-colors hover:underline"
              >
                {crumb.label}
              </Link>
            )}
            {!isLast && <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-40" />}
          </span>
        );
      })}
    </nav>
  );
}
