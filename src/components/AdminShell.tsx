import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarPlus,
  ChevronRight,
  Code2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Medal,
  Moon,
  Star,
  Sun,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV: readonly { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/events", label: "Events", icon: CalendarPlus, exact: false },
  { to: "/admin/participants", label: "Participants", icon: Users, exact: false },
  { to: "/admin/leaderboard", label: "Leaderboard", icon: Medal, exact: false },
  { to: "/admin/shortlist", label: "Shortlisting", icon: Star, exact: false },
  { to: "/admin/results", label: "Results", icon: BarChart3, exact: false },
];

export function AdminShell({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function toggleTheme() {
    const light = document.documentElement.classList.toggle("light");
    localStorage.setItem("debugify-theme", light ? "light" : "dark");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Brand */}
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Code2 className="h-4 w-4 text-primary" />
          </div>
          <span className="font-display text-base font-bold tracking-tight">
            debug<span className="text-primary">ify</span>
          </span>
          <span className="ml-auto rounded border border-primary/30 px-1.5 py-0.5 font-mono-code text-[10px] text-primary">
            ADMIN
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <p className="mb-2 px-2 pt-1 font-mono-code text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Control room
          </p>
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: exact ?? false }}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-primary/15 text-foreground font-medium" }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              <ChevronRight className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 font-display text-xs font-bold text-primary">
              {name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{name}</p>
              <p className="text-[10px] text-muted-foreground">Coordinator</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-1"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <Sun className="h-3.5 w-3.5" />
              <Moon className="sr-only h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-1 text-muted-foreground hover:text-destructive"
              onClick={signOut}
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-background/80 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListChecks className="h-4 w-4" />
            <span className="font-mono-code text-xs uppercase tracking-wider">
              Debugify Admin Portal
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={cn("glass-panel rounded-xl p-5", accent && "border-l-2 " + accent)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
