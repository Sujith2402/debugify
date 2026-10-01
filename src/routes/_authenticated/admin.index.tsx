import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CalendarPlus, Star, TrendingUp, UserPlus } from "lucide-react";
import { adminOverview } from "@/lib/admin.functions";
import { formatDateTime } from "@/lib/debugify";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/AdminShell";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function Overview() {
  const { me } = Route.useRouteContext();
  const fetchOverview = useServerFn(adminOverview);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchOverview() });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono-code text-xs uppercase tracking-widest text-primary/70">Control room</p>
          <h1 className="mt-1 text-3xl font-bold">
            Welcome back, <span className="text-primary">{me.fullName || "Coordinator"}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's what's happening in the arena today.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/participants">
              <UserPlus className="h-4 w-4" /> Add participant
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/admin/events/new">
              <CalendarPlus className="h-4 w-4" /> New event
            </Link>
          </Button>
        </div>
      </div>

      {error && <p className="text-destructive">{(error as Error).message}</p>}

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel h-[100px] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : data && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Total participants"
            value={data.totalParticipants}
            sub={`${data.activeParticipants} active`}
            accent="border-primary"
          />
          <StatCard
            label="Total events"
            value={data.totalEvents}
            sub={`${data.liveEvents} live now`}
            accent="border-neon-cyan"
          />
          <StatCard
            label="MCQ submitted"
            value={data.mcqSubmitted}
            sub={`${data.mcqInProgress} in progress`}
          />
          <StatCard
            label="Coding submitted"
            value={data.codingSubmitted}
            sub="Round 2"
          />
          <StatCard
            label="Avg MCQ score"
            value={data.avgMcq ?? "—"}
            sub="out of 40"
            accent="border-neon-lime"
          />
          <StatCard
            label="Top MCQ score"
            value={data.topMcq ?? "—"}
            sub="out of 40"
            accent="border-neon-pink"
          />
        </div>
      )}

      {/* Two-column grid: Upcoming events + Quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming & active events */}
        <section className="glass-panel col-span-2 rounded-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">Upcoming &amp; active events</h2>
            <Link to="/admin/events" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              All events <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data && data.upcoming.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No events yet.{" "}
                <Link to="/admin/events/new" className="text-primary hover:underline">
                  Create your first one →
                </Link>
              </p>
            )}
            {data?.upcoming.map((e) => (
              <Link
                key={e.id}
                to="/admin/events/$id"
                params={{ id: e.id }}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/50"
              >
                <StatusBadge value={e.type} />
                <span className="font-medium">{e.name}</span>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(e.starts_at)} → {formatDateTime(e.ends_at)}
                </span>
                <StatusBadge value={e.status} className="ml-auto" />
              </Link>
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section className="glass-panel rounded-xl">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">Quick actions</h2>
          </div>
          <div className="divide-y divide-border">
            {[
              { to: "/admin/events/new", label: "Create MCQ event", icon: CalendarPlus, sub: "Round 1 assessment" },
              { to: "/admin/participants", label: "Manage participants", icon: UserPlus, sub: "Add, edit, disable" },
              { to: "/admin/leaderboard", label: "View leaderboard", icon: TrendingUp, sub: "Rankings & scores" },
              { to: "/admin/shortlist", label: "Shortlist participants", icon: Star, sub: "Advance to Round 2" },
            ].map(({ to, label, icon: Icon, sub }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground/50" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
