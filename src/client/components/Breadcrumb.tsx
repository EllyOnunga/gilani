import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  tutor: "Tutor Chat",
  settings: "Settings",
  teacher: "Teacher",
  escalations: "Escalations",
  admin: "Admin",
  users: "Users & Roles",
};

type Crumb = {
  label: string;
  href: string;
  navigable: boolean; // false = render as plain text, not a link
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Intermediate layout paths that exist in the router but have no meaningful
 * standalone content — clicking them is confusing, so we suppress the link.
 */
const NON_NAVIGABLE_INTERMEDIATES = new Set(["/tutor"]);

function getCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);

  // Always start with Home → Dashboard
  const crumbs: Crumb[] = [{ label: "Home", href: "/tutor", navigable: true }];

  let accumulated = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    accumulated += `/${segment}`;

    const isUuid = UUID_RE.test(segment);

    if (isUuid) {
      // Dynamic param — label based on the parent segment
      const parent = segments[i - 1] ?? "";
      const label =
        parent === "tutor" ? "Chat Session" : parent === "escalations" ? "Escalation" : "Session";
      crumbs.push({ label, href: accumulated, navigable: true });
      continue;
    }

    // Compound routes: teacher/escalations, admin/users — collapse parent into
    // a non-navigable label and emit the full path as the leaf
    const nextSegment = segments[i + 1];
    if (
      nextSegment &&
      !UUID_RE.test(nextSegment) &&
      (segment === "teacher" || segment === "admin")
    ) {
      const parentLabel = ROUTE_LABELS[segment] ?? segment;
      crumbs.push({ label: parentLabel, href: accumulated, navigable: false });
      accumulated += `/${nextSegment}`;
      const leafLabel =
        ROUTE_LABELS[nextSegment] ?? nextSegment.charAt(0).toUpperCase() + nextSegment.slice(1);
      crumbs.push({ label: leafLabel, href: accumulated, navigable: true });
      i++; // consumed nextSegment
      continue;
    }

    const label = ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
    const navigable = !NON_NAVIGABLE_INTERMEDIATES.has(accumulated);
    crumbs.push({ label, href: accumulated, navigable });
  }

  // Remove duplicate if first crumb after Home is also /dashboard
  if (crumbs.length > 1 && crumbs[1].href === "/tutor") {
    return crumbs.slice(1);
  }

  return crumbs;
}

export function Breadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = getCrumbs(pathname);

  // Don't show breadcrumb on dashboard root or single-crumb pages
  if (pathname === "/tutor" || crumbs.length <= 1) return null;

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
            {isLast || !crumb.navigable ? (
              <span className={isLast ? "font-semibold text-foreground" : "opacity-60"}>
                {crumb.label}
              </span>
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
