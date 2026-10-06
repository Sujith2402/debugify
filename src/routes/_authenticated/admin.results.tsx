import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { BarChart3, Eye, EyeOff, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  getMcqResults, getCodingResults, listEvents,
  publishResults, unpublishResults,
} from "@/lib/admin.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/results")({
  component: ResultsPage,
});

function fmtDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

// ---- Publish Banner ----
function PublishBanner({ eventId, eventName }: { eventId: string; eventName: string }) {
  const qc = useQueryClient();
  const doPublish   = useServerFn(publishResults);
  const doUnpublish = useServerFn(unpublishResults);
  const fetchEvents = useServerFn(listEvents);
  const { data: events } = useQuery({ queryKey: ["events"], queryFn: () => fetchEvents() });

  const ev = (events ?? []).find((e: any) => e.id === eventId);
  const published = (ev as any)?.results_published ?? false;

  const pub = useMutation({
    mutationFn: () => doPublish({ data: { eventId } }),
    onSuccess: () => {
      toast.success("Results published — participants can now see the leaderboard.");
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unpub = useMutation({
    mutationFn: () => doUnpublish({ data: { eventId } }),
    onSuccess: () => {
      toast.success("Results hidden from participants.");
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!eventId) return null;

  return (
    <div className={cn(
      "flex items-center justify-between rounded-xl border px-4 py-3",
      published ? "border-neon-lime/30 bg-neon-lime/5" : "border-border bg-muted/20"
    )}>
      <div className="flex items-center gap-2">
        {published
          ? <><Eye className="h-4 w-4 text-neon-lime" /><span className="text-sm font-medium text-neon-lime">Results published</span><span className="text-xs text-muted-foreground">— visible to participants</span></>
          : <><EyeOff className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Results hidden</span><span className="text-xs text-muted-foreground">— not visible to participants yet</span></>}
      </div>
      {published ? (
        <Button size="sm" variant="outline" onClick={() => unpub.mutate()} disabled={unpub.isPending} className="gap-1.5">
          <EyeOff className="h-3.5 w-3.5" />{unpub.isPending ? "Hiding…" : "Unpublish"}
        </Button>
      ) : (
        <Button size="sm" onClick={() => pub.mutate()} disabled={pub.isPending} className="gap-1.5 bg-neon-lime text-background hover:bg-neon-lime/90 font-bold">
          <Eye className="h-3.5 w-3.5" />{pub.isPending ? "Publishing…" : "Publish Results"}
        </Button>
      )}
    </div>
  );
}

// ---- MCQ Results ----
function McqResults() {
  const fetch = useServerFn(getMcqResults);
  const { data, isLoading } = useQuery({ queryKey: ["mcq-results"], queryFn: () => fetch() });
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [eventFilter, setEventFilter]   = useState("ALL");

  const events = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of data ?? []) if (r.event) seen.set(r.event.id, r.event.name);
    return [...seen.entries()];
  }, [data]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      const matchSearch = !s || r.profile?.participant_code?.toLowerCase().includes(s) || r.profile?.full_name?.toLowerCase().includes(s);
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchEvent  = eventFilter  === "ALL" || r.event_id === eventFilter;
      return matchSearch && matchStatus && matchEvent;
    });
  }, [data, search, statusFilter, eventFilter]);

  if (isLoading) return <LoadingRows />;

  return (
    <div className="space-y-4">
      {eventFilter !== "ALL" && <PublishBanner eventId={eventFilter} eventName={events.find(([id]) => id === eventFilter)?.[1] ?? ""} />}

      <Filters search={search} onSearch={setSearch}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
          </SelectContent>
        </Select>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Event" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All events</SelectItem>
            {events.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} records</span>
      </Filters>

      <div className="glass-panel overflow-x-auto rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Correct</TableHead>
              <TableHead className="text-right">Wrong</TableHead>
              <TableHead className="text-right">Unanswered</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filtered.length && (
              <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No results found.</TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={`${r.user_id}-${r.event_id}`}>
                <TableCell className="font-mono-code text-sm">{r.profile?.participant_code ?? "—"}</TableCell>
                <TableCell>{r.profile?.full_name ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.event?.name ?? "—"}</TableCell>
                <TableCell className="text-right font-display font-bold text-primary">{r.score ?? "—"}</TableCell>
                <TableCell className="text-right text-neon-lime">{r.correct_count ?? "—"}</TableCell>
                <TableCell className="text-right text-destructive">{r.wrong_count ?? "—"}</TableCell>
                <TableCell className="text-right text-muted-foreground">{r.unanswered_count ?? "—"}</TableCell>
                <TableCell className="text-right font-mono-code text-sm">{fmtDuration(r.duration)}</TableCell>
                <TableCell><StatusBadge value={r.status ?? "—"} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---- Coding Results ----
function CodingResults() {
  const fetch = useServerFn(getCodingResults);
  const { data, isLoading } = useQuery({ queryKey: ["coding-results"], queryFn: () => fetch() });
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [eventFilter, setEventFilter]   = useState("ALL");

  const events = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of data ?? []) if (r.event) seen.set(r.event.id, r.event.name);
    return [...seen.entries()];
  }, [data]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      const matchSearch = !s || r.profile?.participant_code?.toLowerCase().includes(s) || r.profile?.full_name?.toLowerCase().includes(s);
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchEvent  = eventFilter  === "ALL" || r.event_id === eventFilter;
      return matchSearch && matchStatus && matchEvent;
    });
  }, [data, search, statusFilter, eventFilter]);

  if (isLoading) return <LoadingRows />;

  return (
    <div className="space-y-4">
      {eventFilter !== "ALL" && <PublishBanner eventId={eventFilter} eventName={events.find(([id]) => id === eventFilter)?.[1] ?? ""} />}

      <Filters search={search} onSearch={setSearch}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
          </SelectContent>
        </Select>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Event" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All events</SelectItem>
            {events.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} records</span>
      </Filters>

      <div className="glass-panel overflow-x-auto rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="text-right">Easy <span className="text-muted-foreground font-normal">/40</span></TableHead>
              <TableHead className="text-right">Medium <span className="text-muted-foreground font-normal">/40</span></TableHead>
              <TableHead className="text-right">Hard <span className="text-muted-foreground font-normal">/20</span></TableHead>
              <TableHead className="text-right font-bold">Total <span className="text-muted-foreground font-normal">/100</span></TableHead>
              <TableHead className="text-right">Cases</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filtered.length && (
              <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">No results found.</TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={`${r.user_id}-${r.event_id}`}>
                <TableCell className="font-mono-code text-sm">{r.profile?.participant_code ?? "—"}</TableCell>
                <TableCell>{r.profile?.full_name ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.event?.name ?? "—"}</TableCell>
                <TableCell className="text-right text-sm text-neon-lime">{r.byDiff?.["EASY"]?.score ?? "—"}</TableCell>
                <TableCell className="text-right text-sm text-warning">{r.byDiff?.["MEDIUM"]?.score ?? "—"}</TableCell>
                <TableCell className="text-right text-sm text-destructive">{r.byDiff?.["HARD"]?.score ?? "—"}</TableCell>
                <TableCell className="text-right font-display font-bold text-primary">{r.total_score ?? "—"}</TableCell>
                <TableCell className="text-right text-sm">{r.total_passed ?? "—"}</TableCell>
                <TableCell className="text-right font-mono-code text-sm">{fmtDuration(r.duration)}</TableCell>
                <TableCell><StatusBadge value={r.status ?? "—"} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Filters({ search, onSearch, children }: { search: string; onSearch: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <Input className="h-9 max-w-56" placeholder="Search participant…" value={search} onChange={(e) => onSearch(e.target.value)} />
      {children}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="glass-panel space-y-2 rounded-xl p-5">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-muted/50" />)}
    </div>
  );
}

function ResultsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Results</h1>
          <p className="text-sm text-muted-foreground">
            All participant submissions. Select an event then use <strong>Publish Results</strong> to make them visible to participants.
          </p>
        </div>
      </div>

      <Tabs defaultValue="mcq">
        <TabsList>
          <TabsTrigger value="mcq">MCQ Results</TabsTrigger>
          <TabsTrigger value="coding">Coding Results</TabsTrigger>
        </TabsList>
        <TabsContent value="mcq" className="mt-4"><McqResults /></TabsContent>
        <TabsContent value="coding" className="mt-4"><CodingResults /></TabsContent>
      </Tabs>
    </div>
  );
}
