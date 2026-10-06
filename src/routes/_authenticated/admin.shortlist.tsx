import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { Star, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getShortlistCandidates, setShortlist, listEvents } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/shortlist")({
  component: ShortlistPage,
});

function fmtDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function ShortlistPage() {
  const qc = useQueryClient();
  const fetchEvents = useServerFn(listEvents);
  const fetchCandidates = useServerFn(getShortlistCandidates);
  const doSetShortlist = useServerFn(setShortlist);

  const { data: events } = useQuery({ queryKey: ["events"], queryFn: () => fetchEvents() });
  const [eventId, setEventId] = useState("");
  const [search, setSearch] = useState("");
  const [topN, setTopN] = useState("");

  const mcqEvents = (events ?? []).filter((e) => e.type === "MCQ");

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["shortlist-candidates", eventId],
    queryFn: () => fetchCandidates({ data: { eventId } }),
    enabled: !!eventId,
  });

  // Init selection from current shortlisted state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // When data loads, preselect already-shortlisted users
  const preselected = useMemo(() => {
    if (!candidates) return new Set<string>();
    return new Set(candidates.filter((c) => c.shortlisted).map((c) => c.user_id));
  }, [candidates]);

  // Merge preselected into selected on first load
  const effective = selected.size > 0 ? selected : preselected;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (candidates ?? []).filter((c) =>
      !s ||
      c.profile?.participant_code?.toLowerCase().includes(s) ||
      c.profile?.full_name?.toLowerCase().includes(s),
    );
  }, [candidates, search]);

  function selectTopN(n: number) {
    const ids = (candidates ?? []).slice(0, n).map((c) => c.user_id);
    setSelected(new Set(ids));
  }

  const save = useMutation({
    mutationFn: () => doSetShortlist({ data: { userIds: [...effective], eventId } }),
    onSuccess: () => {
      toast.success(`${effective.size} participants shortlisted for Round 2`);
      qc.invalidateQueries({ queryKey: ["shortlist-candidates", eventId] });
      qc.invalidateQueries({ queryKey: ["participants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Star className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Shortlisting</h1>
          <p className="text-sm text-muted-foreground">
            Select participants from the MCQ leaderboard to advance to Round 2.
          </p>
        </div>
      </div>

      {/* Event selector */}
      <div className="glass-panel rounded-xl p-5">
        <p className="mb-3 text-sm font-medium">Step 1 — Select the MCQ event to shortlist from</p>
        <Select value={eventId} onValueChange={(v) => { setEventId(v); setSelected(new Set()); }}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Choose an MCQ event…" />
          </SelectTrigger>
          <SelectContent>
            {mcqEvents.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {eventId && (
        <>
          {/* Controls */}
          <div className="glass-panel rounded-xl p-5 space-y-4">
            <p className="text-sm font-medium">Step 2 — Pick participants to shortlist</p>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="max-w-xs"
                placeholder="Search by ID or name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Select top:
                {[5, 10, 15, 20].map((n) => (
                  <Button
                    key={n}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => { selectTopN(n); setTopN(String(n)); }}
                  >
                    {n}
                  </Button>
                ))}
                <Input
                  type="number"
                  min={1}
                  className="h-7 w-20"
                  placeholder="N"
                  value={topN}
                  onChange={(e) => setTopN(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => topN && selectTopN(Number(topN))}
                  disabled={!topN}
                >
                  Apply
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear all
              </Button>
              <span className="ml-auto font-mono-code text-sm text-primary">
                {effective.size} selected
              </span>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="glass-panel space-y-2 rounded-xl p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : !candidates?.length ? (
            <div className="glass-panel rounded-xl py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No submitted attempts for this event yet.</p>
            </div>
          ) : (
            <div className="glass-panel overflow-x-auto rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={effective.size === (candidates?.length ?? 0)}
                        onCheckedChange={(c) => {
                          if (c) setSelected(new Set(candidates?.map((r) => r.user_id) ?? []));
                          else setSelected(new Set());
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">/ 40</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c, i) => {
                    const rank = (candidates ?? []).findIndex((x) => x.user_id === c.user_id) + 1;
                    const isSelected = effective.has(c.user_id);
                    return (
                      <TableRow
                        key={c.user_id}
                        className={isSelected ? "bg-primary/5" : ""}
                        onClick={() => {
                          const n = new Set(effective);
                          if (n.has(c.user_id)) n.delete(c.user_id);
                          else n.add(c.user_id);
                          setSelected(n);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(ch) => {
                              const n = new Set(effective);
                              ch ? n.add(c.user_id) : n.delete(c.user_id);
                              setSelected(n);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono-code text-sm text-muted-foreground">
                          #{rank}
                        </TableCell>
                        <TableCell className="font-mono-code text-sm">
                          {c.profile?.participant_code ?? "—"}
                        </TableCell>
                        <TableCell>{c.profile?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-right font-display text-lg font-bold text-primary">
                          {c.score ?? 0}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">40</TableCell>
                        <TableCell className="text-right font-mono-code text-sm">
                          {fmtDuration(c.duration)}
                        </TableCell>
                        <TableCell>
                          {c.shortlisted && (
                            <span className="inline-flex items-center gap-1 rounded border border-neon-lime/60 px-2 py-0.5 font-mono-code text-[11px] text-neon-lime">
                              <CheckCircle className="h-3 w-3" /> shortlisted
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Save button */}
          {candidates && candidates.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-5 py-4">
              <div>
                <p className="text-sm font-medium">
                  {effective.size} participant{effective.size !== 1 ? "s" : ""} will be shortlisted
                </p>
                <p className="text-xs text-muted-foreground">
                  They'll be eligible to be assigned to the coding round.
                </p>
              </div>
              <Button
                disabled={save.isPending}
                onClick={() => save.mutate()}
                className="gap-2"
              >
                <Star className="h-4 w-4" />
                {save.isPending ? "Saving…" : "Save shortlist"}
              </Button>
            </div>
          )}
        </>
      )}

      {!eventId && (
        <div className="glass-panel rounded-xl py-16 text-center">
          <Star className="mx-auto h-12 w-12 text-muted-foreground/20" />
          <p className="mt-4 text-muted-foreground">
            Select an MCQ event above to begin shortlisting participants.
          </p>
        </div>
      )}
    </div>
  );
}
