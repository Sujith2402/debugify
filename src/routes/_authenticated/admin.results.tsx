import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { BarChart3, Filter } from "lucide-react";
import { getMcqResults, getCodingResults } from "@/lib/admin.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/admin/results")({
  component: ResultsPage,
});

function fmtDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function McqResults() {
  const fetch = useServerFn(getMcqResults);
  const { data, isLoading } = useQuery({ queryKey: ["mcq-results"], queryFn: () => fetch() });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");

  const events = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of data ?? []) if (r.event) seen.set(r.event.id, r.event.name);
    return [...seen.entries()];
  }, [data]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      const matchSearch = !s ||
        r.profile?.participant_code?.toLowerCase().includes(s) ||
        r.profile?.full_name?.toLowerCase().includes(s);
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchEvent = eventFilter === "ALL" || r.event_id === eventFilter;
      return matchSearch && matchStatus && matchEvent;
    });
  }, [data, search, statusFilter, eventFilter]);

  if (isLoading) return <LoadingRows />;

  return (
    <div className="space-y-4">
      <Filters search={search} onSearch={setSearch}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="NOT_STARTED">Not started</SelectItem>
          </SelectContent>
        </Select>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="Event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All events</SelectItem>
            {events.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
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
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => {
              return (
                <TableRow key={`${r.user_id}-${r.event_id}`}>
                  <TableCell className="font-mono-code text-sm">
                    {r.profile?.participant_code ?? "—"}
                  </TableCell>
                  <TableCell>{r.profile?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.event?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-display font-bold text-primary">
                    {r.score ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-neon-lime">{r.correct_count ?? "—"}</TableCell>
                  <TableCell className="text-right text-destructive">{r.wrong_count ?? "—"}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.unanswered_count ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono-code text-sm">
                    {fmtDuration(r.duration)}
                  </TableCell>
                  <TableCell><StatusBadge value={r.status ?? "—"} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CodingResults() {
  const fetch = useServerFn(getCodingResults);
  const { data, isLoading } = useQuery({ queryKey: ["coding-results"], queryFn: () => fetch() });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");

  const events = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of data ?? []) if (r.event) seen.set(r.event.id, r.event.name);
    return [...seen.entries()];
  }, [data]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      const matchSearch = !s ||
        r.profile?.participant_code?.toLowerCase().includes(s) ||
        r.profile?.full_name?.toLowerCase().includes(s);
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchEvent = eventFilter === "ALL" || r.event_id === eventFilter;
      return matchSearch && matchStatus && matchEvent;
    });
  }, [data, search, statusFilter, eventFilter]);

  if (isLoading) return <LoadingRows />;

  return (
    <div className="space-y-4">
      <Filters search={search} onSearch={setSearch}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
          </SelectContent>
        </Select>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="Event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All events</SelectItem>
            {events.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
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
              <TableHead className="text-right">Easy</TableHead>
              <TableHead className="text-right">Medium</TableHead>
              <TableHead className="text-right">Hard</TableHead>
              <TableHead className="text-right font-bold">Total</TableHead>
              <TableHead className="text-right">Cases</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={`${r.user_id}-${r.event_id}`}>
                <TableCell className="font-mono-code text-sm">
                  {r.profile?.participant_code ?? "—"}
                </TableCell>
                <TableCell>{r.profile?.full_name ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.event?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {r.byDiff?.EASY?.score ?? "—"}
                  <span className="text-muted-foreground text-xs"> /45</span>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {r.byDiff?.MEDIUM?.score ?? "—"}
                  <span className="text-muted-foreground text-xs"> /45</span>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {r.byDiff?.HARD?.score ?? "—"}
                  <span className="text-muted-foreground text-xs"> /60</span>
                </TableCell>
                <TableCell className="text-right font-display font-bold text-primary">
                  {r.total_score ?? "—"}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {r.total_passed ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono-code text-sm">
                  {fmtDuration(r.duration)}
                </TableCell>
                <TableCell><StatusBadge value={r.status ?? "—"} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Filters({
  search,
  onSearch,
  children,
}: {
  search: string;
  onSearch: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <Input
        className="h-9 max-w-56"
        placeholder="Search participant…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      {children}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="glass-panel space-y-2 rounded-xl p-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-muted/50" />
      ))}
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
            All participant submissions with scores and timings.
          </p>
        </div>
      </div>

      <Tabs defaultValue="mcq">
        <TabsList>
          <TabsTrigger value="mcq">MCQ Results</TabsTrigger>
          <TabsTrigger value="coding">Coding Results</TabsTrigger>
        </TabsList>
        <TabsContent value="mcq" className="mt-4">
          <McqResults />
        </TabsContent>
        <TabsContent value="coding" className="mt-4">
          <CodingResults />
        </TabsContent>
      </Tabs>
    </div>
  );
}
