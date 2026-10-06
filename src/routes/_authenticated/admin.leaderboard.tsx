import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Medal, Trophy } from "lucide-react";
import { getMcqLeaderboard, getCodingLeaderboard, listEvents } from "@/lib/admin.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/leaderboard")({
  component: LeaderboardPage,
});

function fmtDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="font-mono-code text-sm text-muted-foreground">#{rank}</span>;
}

function McqLeaderboard({ eventId }: { eventId: string }) {
  const fetch = useServerFn(getMcqLeaderboard);
  const { data, isLoading } = useQuery({
    queryKey: ["mcq-leaderboard", eventId],
    queryFn: () => fetch({ data: { eventId } }),
    enabled: !!eventId,
  });

  if (!eventId) return <EmptyState message="Select an MCQ event to view its leaderboard." />;
  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState message="No submissions yet for this event." />;

  return (
    <div className="glass-panel overflow-x-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Participant</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right">/ 40</TableHead>
            <TableHead className="text-right">Duration</TableHead>
            <TableHead>Submitted at</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={row.user_id} className={i < 3 ? "bg-primary/5" : ""}>
              <TableCell><RankBadge rank={i + 1} /></TableCell>
              <TableCell className="font-mono-code text-sm">
                {row.profile?.participant_code ?? "—"}
              </TableCell>
              <TableCell>{row.profile?.full_name ?? "—"}</TableCell>
              <TableCell className="text-right font-display text-lg font-bold text-primary">
                {row.score ?? 0}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-sm">40</TableCell>
              <TableCell className="text-right font-mono-code text-sm">
                {fmtDuration(row.duration)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.submitted_at ? new Date(row.submitted_at).toLocaleTimeString() : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CodingLeaderboard({ eventId }: { eventId: string }) {
  const fetch = useServerFn(getCodingLeaderboard);
  const { data, isLoading } = useQuery({
    queryKey: ["coding-leaderboard", eventId],
    queryFn: () => fetch({ data: { eventId } }),
    enabled: !!eventId,
  });

  if (!eventId) return <EmptyState message="Select a coding event to view its leaderboard." />;
  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState message="No submissions yet for this event." />;

  return (
    <div className="glass-panel overflow-x-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Participant</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Easy <span className="text-muted-foreground font-normal">/40</span></TableHead>
            <TableHead className="text-right">Medium <span className="text-muted-foreground font-normal">/40</span></TableHead>
            <TableHead className="text-right">Hard <span className="text-muted-foreground font-normal">/20</span></TableHead>
            <TableHead className="text-right font-bold">Total</TableHead>
            <TableHead className="text-right">/ 100</TableHead>
            <TableHead className="text-right">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={row.user_id} className={i < 3 ? "bg-primary/5" : ""}>
              <TableCell><RankBadge rank={i + 1} /></TableCell>
              <TableCell className="font-mono-code text-sm">
                {row.profile?.participant_code ?? "—"}
              </TableCell>
              <TableCell>{row.profile?.full_name ?? "—"}</TableCell>
              <TableCell className="text-right text-sm">
                {row.byDiff?.["EASY"]?.score ?? "—"}
              </TableCell>
              <TableCell className="text-right text-sm">
                {row.byDiff?.["MEDIUM"]?.score ?? "—"}
              </TableCell>
              <TableCell className="text-right text-sm">
                {row.byDiff?.["HARD"]?.score ?? "—"}
              </TableCell>
              <TableCell className="text-right font-display text-lg font-bold text-primary">
                {row.total_score ?? 0}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-sm">100</TableCell>
              <TableCell className="text-right font-mono-code text-sm">
                {fmtDuration(row.duration)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LeaderboardPage() {
  const fetchEvents = useServerFn(listEvents);
  const { data: events } = useQuery({ queryKey: ["events"], queryFn: () => fetchEvents() });
  const [mcqEventId, setMcqEventId] = useState("");
  const [codingEventId, setCodingEventId] = useState("");

  const mcqEvents = (events ?? []).filter((e) => e.type === "MCQ");
  const codingEvents = (events ?? []).filter((e) => e.type === "CODING");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Medal className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Rankings by score, then fastest completion time.</p>
        </div>
      </div>

      <Tabs defaultValue="mcq">
        <TabsList>
          <TabsTrigger value="mcq">
            <Trophy className="mr-1.5 h-4 w-4" /> MCQ Round
          </TabsTrigger>
          <TabsTrigger value="coding">
            <Trophy className="mr-1.5 h-4 w-4" /> Coding Round
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mcq" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Select value={mcqEventId} onValueChange={setMcqEventId}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Select an MCQ event…" />
              </SelectTrigger>
              <SelectContent>
                {mcqEvents.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mcqEventId && (
              <span className="text-xs text-muted-foreground">
                Sorted: score ↓ then completion time ↑
              </span>
            )}
          </div>
          <McqLeaderboard eventId={mcqEventId} />
        </TabsContent>

        <TabsContent value="coding" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Select value={codingEventId} onValueChange={setCodingEventId}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Select a coding event…" />
              </SelectTrigger>
              <SelectContent>
                {codingEvents.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {codingEventId && (
              <span className="text-xs text-muted-foreground">
                Sorted: total ↓, test cases ↓, time ↑
              </span>
            )}
          </div>
          <CodingLeaderboard eventId={codingEventId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-panel rounded-xl py-16 text-center">
      <Medal className="mx-auto h-10 w-10 text-muted-foreground/30" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="glass-panel space-y-2 rounded-xl p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/50" />
      ))}
    </div>
  );
}
