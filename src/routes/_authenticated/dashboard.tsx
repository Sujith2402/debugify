import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import {
  ArrowRight, CheckCircle2, Clock, Code2, ListChecks, Send, Trophy,
  Medal, Star, BarChart2, Radio,
} from "lucide-react";
import { toast } from "sonner";
import { getMyIdentity } from "@/lib/auth.functions";
import {
  getMyAssignedEvents, getEventAssessment, submitMcqTest,
  getPublishedMcqResults, getPublishedCodingResults,
} from "@/lib/participant.functions";
import { formatDateTime } from "@/lib/debugify";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { CodingTestRunner } from "@/components/CodingTestRunner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Assessments — Debugify" },
      { name: "description", content: "Your assigned Debugify assessments." },
      { property: "og:title", content: "My Assessments — Debugify" },
      { property: "og:description", content: "Your assigned Debugify assessments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const me = await getMyIdentity();
    if (me.role === "admin") throw redirect({ to: "/admin" });
    return { me };
  },
  component: ParticipantDashboard,
});

const NAV = [
  { to: "/dashboard", label: "Assessments" },
];

type ActiveView =
  | { kind: "list" }
  | { kind: "mcq-test"; eventId: string }
  | { kind: "coding-test"; eventId: string };

function ParticipantDashboard() {
  const { me } = Route.useRouteContext();
  const fetchAssigned = useServerFn(getMyAssignedEvents);
  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["my-assigned-events"],
    queryFn: () => fetchAssigned(),
  });

  const fetchMcqPub     = useServerFn(getPublishedMcqResults);
  const fetchCodingPub  = useServerFn(getPublishedCodingResults);
  const { data: pubMcq }    = useQuery({ queryKey: ["pub-mcq-results"],    queryFn: () => fetchMcqPub() });
  const { data: pubCoding }  = useQuery({ queryKey: ["pub-coding-results"],  queryFn: () => fetchCodingPub() });

  const [view, setView] = useState<ActiveView>({ kind: "list" });

  if (view.kind === "mcq-test") {
    return (
      <MCQTestRunner
        eventId={view.eventId}
        onClose={() => { setView({ kind: "list" }); refetch(); }}
      />
    );
  }

  if (view.kind === "coding-test") {
    return (
      <CodingTestRunner
        eventId={view.eventId}
        onClose={() => { setView({ kind: "list" }); refetch(); }}
      />
    );
  }

  return (
    <AppShell name={me.fullName} badge={me.participantCode ?? "PARTICIPANT"} nav={NAV}>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-background to-card p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono-code text-xs font-semibold uppercase tracking-widest text-neon-cyan">
                Participant Portal
              </span>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Welcome, <span className="text-primary">{me.fullName || "Participant"}</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Participant ID: <span className="font-mono-code font-bold text-foreground">{me.participantCode ?? "—"}</span>
              </p>
            </div>
            <span className="rounded-lg border border-neon-lime/40 bg-neon-lime/10 px-3 py-1.5 font-mono-code text-xs text-neon-lime">
              Active Assessment Access
            </span>
          </div>
        </div>

        {/* Assigned Events */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Your Assigned Assessments</h2>
            <span className="text-xs text-muted-foreground font-mono-code">{events?.length ?? 0} tests assigned</span>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-44 animate-pulse rounded-xl bg-muted/40" />
              <div className="h-44 animate-pulse rounded-xl bg-muted/40" />
            </div>
          ) : !events?.length ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <ListChecks className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-base font-semibold">No assessments assigned yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your event coordinator will assign you to MCQ or Coding tests. Please check back shortly.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {events.map((ev: any) => {
                const isSubmitted = ev.attempt?.status === "SUBMITTED" || ev.assignmentStatus === "SUBMITTED";
                const isMcq = ev.type === "MCQ";
                return (
                  <div
                    key={ev.id}
                    className={cn(
                      "glass-panel relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 transition-all hover:border-primary/50",
                      isSubmitted && "border-neon-lime/30"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono-code text-[11px] font-medium text-primary">
                          {isMcq ? <ListChecks className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
                          {ev.type} ROUND
                        </span>
                        <StatusBadge value={isSubmitted ? "SUBMITTED" : ev.status} />
                      </div>

                      <h3 className="mt-3.5 font-display text-xl font-bold text-foreground">{ev.name}</h3>

                      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-neon-cyan" />
                          <span>Window: {formatDateTime(ev.starts_at)} → {formatDateTime(ev.ends_at)}</span>
                        </div>
                        {!isMcq && (
                          <div className="flex items-center gap-2">
                            <Code2 className="h-3.5 w-3.5 text-primary" />
                            <span>3 problems (Easy 40pts · Medium 40pts · Hard 20pts) = 100 total</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-border/60 pt-4">
                      {isSubmitted ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-neon-lime text-sm font-semibold">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Submitted</span>
                          </div>
                          {ev.attempt?.score !== undefined && (
                            <span className="font-mono-code text-sm font-bold text-foreground">
                              Score: <span className="text-primary text-base">{ev.attempt.score}</span>
                              {isMcq ? " / 40" : " / 100"}
                            </span>
                          )}
                          {ev.attempt?.total_score !== undefined && !isMcq && (
                            <span className="font-mono-code text-sm font-bold text-foreground">
                              Score: <span className="text-primary text-base">{ev.attempt.total_score}</span> / 100
                            </span>
                          )}
                        </div>
                      ) : ev.status !== "LIVE" ? (
                        <p className="text-sm text-muted-foreground text-center">
                          {ev.status === "SCHEDULED" ? "⏳ Test not started yet" : ev.status === "COMPLETED" ? "Test closed" : ev.status}
                        </p>
                      ) : (
                        <Button
                          className="w-full font-bold shadow-[0_0_20px_rgba(0,255,200,0.15)]"
                          onClick={() => setView({ kind: isMcq ? "mcq-test" : "coding-test", eventId: ev.id })}
                        >
                          {isMcq ? "Start MCQ Assessment" : "Enter Coding Round"} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Published Results Section */}
        {(pubMcq?.length || pubCoding?.length) ? (
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Published Results</h2>
            </div>

            {pubMcq && pubMcq.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <ListChecks className="h-4 w-4" /> Round 1 — MCQ Leaderboard
                </h3>
                <div className="glass-panel overflow-x-auto rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="p-3 text-left w-12">Rank</th>
                        <th className="p-3 text-left">Participant ID</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-right">Score</th>
                        <th className="p-3 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(pubMcq as any[]).slice(0, 15).map((r: any, i: number) => (
                        <tr key={`${r.user_id}-${r.event_id}`} className={cn(i < 3 ? "bg-primary/5" : "")}>
                          <td className="p-3">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="font-mono-code text-muted-foreground">#{i + 1}</span>}
                          </td>
                          <td className="p-3 font-mono-code text-sm">{r.profile?.participant_code ?? "—"}</td>
                          <td className="p-3">{r.profile?.full_name ?? "—"}</td>
                          <td className="p-3 text-right font-display font-bold text-primary">{r.score ?? "—"}</td>
                          <td className="p-3 text-right font-mono-code text-xs text-muted-foreground">
                            {r.duration_seconds != null ? `${Math.floor(r.duration_seconds / 60)}m ${r.duration_seconds % 60}s` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {pubCoding && pubCoding.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Code2 className="h-4 w-4" /> Round 2 — Coding Leaderboard
                </h3>

                {/* Top 3 Podium */}
                {(pubCoding as any[]).length >= 1 && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {([1, 0, 2] as const).filter((rank) => (pubCoding as any[])[rank]).map((rank) => {
                      const r = (pubCoding as any[])[rank];
                      const medals = ["🥇", "🥈", "🥉"];
                      const heights = ["h-36", "h-44", "h-32"];
                      const podiumOrder = [1, 0, 2]; // display order: 2nd, 1st, 3rd
                      const displayRank = rank; // actual array index = rank
                      return (
                        <div key={r.user_id} className={cn(
                          "glass-panel flex flex-col items-center justify-end rounded-2xl p-5 text-center",
                          rank === 0 && "border-primary/40 bg-primary/5 shadow-[0_0_30px_rgba(100,200,255,0.1)]",
                          heights[rank]
                        )}>
                          <span className="text-3xl mb-1">{medals[rank]}</span>
                          <p className="font-mono-code text-xs text-muted-foreground">{r.profile?.participant_code}</p>
                          <p className="font-display text-sm font-bold truncate max-w-full">{r.profile?.full_name ?? "—"}</p>
                          <p className="font-display text-2xl font-bold text-primary mt-1">{r.total_score}</p>
                          <p className="text-xs text-muted-foreground">/ 100 pts</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="glass-panel overflow-x-auto rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="p-3 text-left w-12">Rank</th>
                        <th className="p-3 text-left">ID</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-right">Easy</th>
                        <th className="p-3 text-right">Med</th>
                        <th className="p-3 text-right">Hard</th>
                        <th className="p-3 text-right font-bold">Total</th>
                        <th className="p-3 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(pubCoding as any[]).slice(0, 10).map((r: any, i: number) => (
                        <tr key={`${r.user_id}-${r.event_id}`} className={cn(i < 3 ? "bg-primary/5" : "")}>
                          <td className="p-3">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="font-mono-code text-muted-foreground">#{i + 1}</span>}</td>
                          <td className="p-3 font-mono-code text-sm">{r.profile?.participant_code ?? "—"}</td>
                          <td className="p-3">{r.profile?.full_name ?? "—"}</td>
                          <td className="p-3 text-right text-neon-lime">{r.byDiff?.["EASY"]?.score ?? "—"}</td>
                          <td className="p-3 text-right text-warning">{r.byDiff?.["MEDIUM"]?.score ?? "—"}</td>
                          <td className="p-3 text-right text-destructive">{r.byDiff?.["HARD"]?.score ?? "—"}</td>
                          <td className="p-3 text-right font-display font-bold text-primary text-base">{r.total_score ?? "—"}</td>
                          <td className="p-3 text-right font-mono-code text-xs text-muted-foreground">
                            {r.duration_seconds != null ? `${Math.floor(r.duration_seconds / 60)}m ${r.duration_seconds % 60}s` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

// ---- MCQ Test Runner (existing, kept as-is) ----
function MCQTestRunner({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const fetchDetails = useServerFn(getEventAssessment);
  const doSubmit = useServerFn(submitMcqTest);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["event-assessment", eventId],
    queryFn: () => fetchDetails({ data: { eventId } }),
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [submittedResult, setSubmittedResult] = useState<{
    score: number; totalQuestions: number; correctCount: number; wrongCount: number; unansweredCount: number;
  } | null>(null);

  useEffect(() => {
    if (submittedResult) return;
    const interval = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [submittedResult]);

  const submitMutation = useMutation({
    mutationFn: () => doSubmit({ data: { eventId, answers, durationSeconds: secondsElapsed } }),
    onSuccess: (res) => {
      setSubmittedResult(res);
      toast.success("Assessment submitted successfully!");
      qc.invalidateQueries({ queryKey: ["my-assigned-events"] });
      qc.invalidateQueries({ queryKey: ["pub-mcq-results"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono-code text-sm text-neon-cyan animate-pulse">Loading assessment questions…</p>
      </div>
    );
  }

  const questions = data.mcqQuestions;
  const currentQ = questions[currentIndex];

  if (submittedResult) {
    return (
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="glass-panel w-full max-w-lg rounded-2xl p-8 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neon-lime/20 text-neon-lime">
            <Trophy className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Assessment Completed!</h2>
            <p className="text-sm text-muted-foreground mt-1">Your answers have been recorded.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-accent/20 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="font-display text-2xl font-bold text-primary">{submittedResult.score} pts</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Correct</p>
              <p className="font-display text-2xl font-bold text-neon-lime">{submittedResult.correctCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="font-mono-code text-lg font-bold">{formatTimer(secondsElapsed)}</p>
            </div>
          </div>
          <Button onClick={onClose} className="w-full">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (!questions.length || !currentQ) {
    return (
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="glass-panel w-full max-w-md rounded-2xl p-8 text-center space-y-4">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h2 className="text-lg font-bold">No questions configured yet</h2>
          <p className="text-xs text-muted-foreground">The coordinator has not added questions to this event yet.</p>
          <Button onClick={onClose} variant="outline" className="w-full">Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-lg">{data.event?.name}</span>
          <span className="rounded bg-primary/20 px-2 py-0.5 font-mono-code text-[11px] text-primary">MCQ Round</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 font-mono-code text-sm font-bold text-neon-cyan">
            <Clock className="h-4 w-4" /><span>{formatTimer(secondsElapsed)}</span>
          </div>
          <Button size="sm" onClick={() => { if (confirm("Are you sure you want to finish and submit?")) submitMutation.mutate(); }}
            disabled={submitMutation.isPending} className="font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="mr-2 h-3.5 w-3.5" />{submitMutation.isPending ? "Submitting…" : "Submit Test"}
          </Button>
        </div>
      </header>

      <div className="flex-1 grid md:grid-cols-[1fr_260px] gap-6 p-6 max-w-7xl mx-auto w-full">
        <div className="glass-panel flex flex-col justify-between rounded-2xl p-6 md:p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <span className="font-mono-code text-sm font-semibold text-neon-cyan">Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-xs text-muted-foreground font-mono-code">Marks: {(currentQ as any).marks ?? 2}</span>
            </div>
            <p className="text-lg font-medium text-foreground leading-relaxed">{(currentQ as any).question}</p>
            <div className="space-y-3 pt-2">
              {(["a", "b", "c", "d"] as const).map((optKey) => {
                const optText = (currentQ as any)[`option_${optKey}`];
                if (!optText) return null;
                const isSelected = answers[currentQ.id]?.toLowerCase() === optKey;
                return (
                  <button key={optKey} type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: optKey }))}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all",
                      isSelected ? "border-neon-cyan bg-neon-cyan/15 text-foreground shadow-[0_0_15px_rgba(0,255,200,0.15)]" : "border-border/80 hover:border-border hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono-code text-xs font-bold uppercase",
                      isSelected ? "border-neon-cyan bg-neon-cyan text-background" : "border-border"
                    )}>{optKey}</span>
                    <span className="text-sm font-medium">{optText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/70 pt-6 mt-8">
            <Button variant="outline" size="sm" disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}>Previous</Button>
            <span className="text-xs text-muted-foreground font-mono-code">{Object.keys(answers).length} of {questions.length} answered</span>
            {currentIndex < questions.length - 1 ? (
              <Button size="sm" onClick={() => setCurrentIndex((i) => i + 1)}>Next <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
            ) : (
              <Button size="sm" className="bg-neon-lime text-background hover:bg-neon-lime/90 font-bold"
                onClick={() => { if (confirm("Ready to submit?")) submitMutation.mutate(); }}
              >Submit Test</Button>
            )}
          </div>
        </div>

        <div className="glass-panel flex flex-col rounded-2xl p-5 space-y-4 h-fit">
          <p className="font-semibold text-sm">Question Palette</p>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q: any, idx: number) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentIndex;
              return (
                <button key={q.id} onClick={() => setCurrentIndex(idx)}
                  className={cn("flex h-9 w-9 items-center justify-center rounded-lg border font-mono-code text-xs font-bold transition",
                    isCurrent && "ring-2 ring-neon-cyan ring-offset-2 ring-offset-background",
                    isAnswered ? "border-neon-lime bg-neon-lime/20 text-neon-lime" : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >{idx + 1}</button>
              );
            })}
          </div>
          <div className="border-t border-border/70 pt-3 text-xs space-y-1.5 text-muted-foreground">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-neon-lime/20 border border-neon-lime" /><span>Answered</span></div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-border" /><span>Unanswered</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
