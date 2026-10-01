import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCodingQuestion, deleteEvent, deleteMcqQuestion, deleteTestCase, getEventDetail, listParticipants,
  moveMcqQuestion, saveCodingQuestion, saveMcqQuestion, saveTestCase, setEventParticipants, setEventStatus, updateEventDetails,
} from "@/lib/admin.functions";
import { MCQ_QUESTION_COUNT, formatDateTime, windowLabel, windowState } from "@/lib/debugify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { CodingForm, McqForm, emptyCoding, emptyMcq, fromLocalInput, toLocalInput } from "@/components/admin/QuestionForms";

export const Route = createFileRoute("/_authenticated/admin/events/$id")({
  component: EventDetail,
});

const CASES = { EASY: 15, MEDIUM: 15, HARD: 20 } as const;
type Detail = Awaited<ReturnType<typeof getEventDetail>>;

function useAct<T>(fn: (a: { data: T }) => Promise<unknown>, success?: string) {
  const qc = useQueryClient();
  const { id } = Route.useParams();
  return useMutation({
    mutationFn: (data: T) => fn({ data }),
    onSuccess: () => { if (success) toast.success(success); qc.invalidateQueries({ queryKey: ["event", id] }); qc.invalidateQueries({ queryKey: ["events"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

function EventDetail() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getEventDetail);
  const { data, isLoading, error } = useQuery({ queryKey: ["event", id], queryFn: () => fetchDetail({ data: { id } }) });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-destructive">{(error as Error)?.message ?? "Event not found"}</p>;
  const ev = data.event;
  const qCount = ev.type === "MCQ" ? data.mcq.length : data.coding.length;

  return (
    <div className="space-y-6">
      <Link to="/admin/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Events</Link>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2"><StatusBadge value={ev.type} /><StatusBadge value={ev.status} /></div>
          <h1 className="mt-2 text-3xl font-bold">{ev.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(ev.starts_at)} → {formatDateTime(ev.ends_at)} · {windowLabel[windowState(ev.starts_at, ev.ends_at)]}
          </p>
        </div>
        <StatusActions d={data} />
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions ({qCount}/{ev.type === "MCQ" ? MCQ_QUESTION_COUNT : 3})</TabsTrigger>
          <TabsTrigger value="participants">Participants ({data.participants.length})</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="questions" className="mt-4">{ev.type === "MCQ" ? <McqTab d={data} /> : <CodingTab d={data} />}</TabsContent>
        <TabsContent value="participants" className="mt-4"><ParticipantsTab d={data} /></TabsContent>
        <TabsContent value="details" className="mt-4"><DetailsTab d={data} /></TabsContent>
      </Tabs>
    </div>
  );
}

function StatusActions({ d }: { d: Detail }) {
  const navigate = useNavigate();
  const setStatus = useAct(useServerFn(setEventStatus), "Status updated");
  const del = useServerFn(deleteEvent);
  const delM = useMutation({
    mutationFn: () => del({ data: { id: d.event.id } }),
    onSuccess: () => { toast.success("Event deleted"); navigate({ to: "/admin/events" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const s = d.event.status;
  const go = (status: "DRAFT" | "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED") => setStatus.mutate({ id: d.event.id, status });
  return (
    <div className="flex flex-wrap gap-2">
      {s === "DRAFT" && <Button onClick={() => go("SCHEDULED")} disabled={setStatus.isPending}>Schedule</Button>}
      {s === "SCHEDULED" && <><Button onClick={() => go("LIVE")}>Start test now</Button><Button variant="outline" onClick={() => go("DRAFT")}>Back to draft</Button></>}
      {s === "LIVE" && <Button onClick={() => go("COMPLETED")}>Mark completed</Button>}
      {(s === "SCHEDULED" || s === "LIVE") && (
        <Confirm title="Cancel this event?" desc="Participants will no longer be able to attempt it." onOk={() => go("CANCELLED")}>
          <Button variant="outline">Cancel event</Button>
        </Confirm>
      )}
      {s === "DRAFT" && (
        <Confirm title="Delete this event?" desc="All its questions and assignments will be removed." onOk={() => delM.mutate()}>
          <Button variant="ghost" size="icon" aria-label="Delete event"><Trash2 /></Button>
        </Confirm>
      )}
    </div>
  );
}

function Confirm({ title, desc, onOk, children }: { title: string; desc: string; onOk: () => void; children: React.ReactNode }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{desc}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Keep</AlertDialogCancel><AlertDialogAction onClick={onOk}>Confirm</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function McqTab({ d }: { d: Detail }) {
  const eventId = d.event.id;
  const save = useAct(useServerFn(saveMcqQuestion), "Question saved");
  const del = useAct(useServerFn(deleteMcqQuestion), "Question deleted");
  const move = useAct(useServerFn(moveMcqQuestion));
  const [edit, setEdit] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      {d.mcq.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
      {d.mcq.map((q, i) => (
        <div key={q.id} className="glass-panel rounded-xl p-4">
          {edit === q.id ? (
            <McqForm initial={{ ...q, correct_option: q.correct_option as "A" }} busy={save.isPending} onCancel={() => setEdit(null)}
              onSave={(nq) => save.mutate({ ...nq, id: q.id, eventId }, { onSuccess: () => setEdit(null) })} />
          ) : (
            <div className="flex gap-3">
              <span className="font-mono-code text-sm text-neon-cyan">Q{i + 1}</span>
              <div className="flex-1 space-y-1">
                <p className="font-medium">{q.question}</p>
                <div className="grid gap-1 text-sm sm:grid-cols-2">
                  {(["A", "B", "C", "D"] as const).map((o) => (
                    <span key={o} className={o === q.correct_option ? "text-neon-lime" : "text-muted-foreground"}>
                      {o}. {q[`option_${o.toLowerCase()}` as "option_a"]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row">
                <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move.mutate({ id: q.id, eventId, dir: "up" })}><ArrowUp /></Button>
                <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === d.mcq.length - 1} onClick={() => move.mutate({ id: q.id, eventId, dir: "down" })}><ArrowDown /></Button>
                <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(q.id)}><Pencil /></Button>
                <Confirm title="Delete question?" desc="This cannot be undone." onOk={() => del.mutate({ id: q.id, eventId })}>
                  <Button size="icon" variant="ghost" aria-label="Delete"><Trash2 /></Button>
                </Confirm>
              </div>
            </div>
          )}
        </div>
      ))}
      {d.mcq.length < MCQ_QUESTION_COUNT && (adding ? (
        <div className="glass-panel rounded-xl p-4">
          <McqForm initial={emptyMcq()} busy={save.isPending} onCancel={() => setAdding(false)} saveLabel="Add question"
            onSave={(q) => save.mutate({ ...q, eventId }, { onSuccess: () => setAdding(false) })} />
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}><Plus /> Add question ({d.mcq.length + 1}/{MCQ_QUESTION_COUNT})</Button>
      ))}
    </div>
  );
}

function CodingTab({ d }: { d: Detail }) {
  const eventId = d.event.id;
  const save = useAct(useServerFn(saveCodingQuestion), "Question saved");
  const del = useAct(useServerFn(deleteCodingQuestion), "Question deleted");
  const [edit, setEdit] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {(["EASY", "MEDIUM", "HARD"] as const).map((diff) => {
        const q = d.coding.find((c) => c.difficulty === diff);
        return (
          <div key={diff} className="glass-panel rounded-xl p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="font-display font-bold">{diff}</span>
              {q && <span className="text-sm text-muted-foreground">{q.cases.length}/{CASES[diff]} test cases</span>}
              {q && edit !== q.id && (
                <div className="ml-auto flex gap-1">
                  <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(q.id)}><Pencil /></Button>
                  <Confirm title="Delete question?" desc="Its test cases will be removed too." onOk={() => del.mutate({ id: q.id })}>
                    <Button size="icon" variant="ghost" aria-label="Delete"><Trash2 /></Button>
                  </Confirm>
                </div>
              )}
            </div>
            {!q || edit === q.id ? (
              <CodingForm initial={q ? { ...q, difficulty: diff } : emptyCoding(diff)} busy={save.isPending} onCancel={q ? () => setEdit(null) : undefined}
                onSave={(nq) => save.mutate({ ...nq, difficulty: diff, eventId, id: q?.id }, { onSuccess: () => setEdit(null) })} />
            ) : (
              <>
                <p className="font-medium">{q.title}</p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{q.description}</p>
                <TestCases q={q} max={CASES[diff]} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TestCases({ q, max }: { q: Detail["coding"][number]; max: number }) {
  const save = useAct(useServerFn(saveTestCase), "Test case saved");
  const del = useAct(useServerFn(deleteTestCase), "Test case deleted");
  const [form, setForm] = useState<{ id?: string; input: string; expected_output: string; is_sample: boolean } | null>(null);
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-medium">Test cases <span className="text-muted-foreground">(sample cases are visible to participants; others stay hidden)</span></p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {q.cases.map((c, i) => (
          <div key={c.id} className="rounded-lg border p-2 text-xs">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono-code">#{i + 1}</span>
              <span className={c.is_sample ? "text-neon-cyan" : "text-muted-foreground"}>{c.is_sample ? "sample" : "hidden"}</span>
              <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => setForm({ id: c.id, input: c.input, expected_output: c.expected_output, is_sample: c.is_sample })}>edit</button>
              <button className="text-destructive" onClick={() => del.mutate({ id: c.id, questionId: q.id })}>delete</button>
            </div>
            <pre className="max-h-16 overflow-hidden font-mono-code text-muted-foreground">{c.input || "(empty)"} → {c.expected_output}</pre>
          </div>
        ))}
      </div>
      {form ? (
        <form className="space-y-2 rounded-lg border p-3" onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ ...form, questionId: q.id }, { onSuccess: () => setForm(null) });
        }}>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1"><Label>Input</Label><Textarea className="font-mono-code" rows={4} value={form.input} onChange={(e) => setForm({ ...form, input: e.target.value })} /></div>
            <div className="space-y-1"><Label>Expected output</Label><Textarea className="font-mono-code" rows={4} required value={form.expected_output} onChange={(e) => setForm({ ...form, expected_output: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_sample} onCheckedChange={(v) => setForm({ ...form, is_sample: v })} /> Sample (shown to participants)</label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>Save test case</Button>
          </div>
        </form>
      ) : q.cases.length < max && (
        <Button size="sm" variant="outline" onClick={() => setForm({ input: "", expected_output: "", is_sample: q.cases.length === 0 })}>
          <Plus /> Add test case ({q.cases.length + 1}/{max})
        </Button>
      )}
    </div>
  );
}

function ParticipantsTab({ d }: { d: Detail }) {
  const fetchParts = useServerFn(listParticipants);
  const { data: people } = useQuery({ queryKey: ["participants"], queryFn: () => fetchParts() });
  const assign = useAct(useServerFn(setEventParticipants), "Assignments saved");
  const [sel, setSel] = useState<Set<string>>(() => new Set(d.participants.map((p) => p.user_id)));
  const [search, setSearch] = useState("");
  const coding = d.event.type === "CODING";
  const eligible = (people ?? []).filter((p) => (p.is_active && (!coding || p.shortlisted)) || sel.has(p.id));
  const shown = eligible.filter((p) => {
    const s = search.toLowerCase();
    return !s || p.participant_code?.toLowerCase().includes(s) || p.full_name.toLowerCase().includes(s);
  });
  return (
    <div className="glass-panel space-y-3 rounded-xl p-5">
      {coding && <p className="text-sm text-muted-foreground">Only shortlisted participants can be assigned to a coding round.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-xs" placeholder="Search participants" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="outline" size="sm" onClick={() => setSel(new Set(eligible.map((p) => p.id)))}>Select all</Button>
        <Button variant="ghost" size="sm" onClick={() => setSel(new Set())}>Clear</Button>
        <span className="text-sm text-muted-foreground">{sel.size} selected</span>
        <Button className="ml-auto" disabled={assign.isPending} onClick={() => assign.mutate({ id: d.event.id, participantIds: [...sel] })}>Save assignments</Button>
      </div>
      <div className="max-h-[28rem] divide-y divide-border overflow-y-auto rounded-lg border">
        {shown.length === 0 && <p className="p-4 text-sm text-muted-foreground">No eligible participants.</p>}
        {shown.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-accent">
            <Checkbox checked={sel.has(p.id)} onCheckedChange={(c) => { const n = new Set(sel); c ? n.add(p.id) : n.delete(p.id); setSel(n); }} />
            <span className="font-mono-code text-sm">{p.participant_code}</span>
            <span>{p.full_name}</span>
            {!p.is_active && <StatusBadge value="DISABLED" />}
          </label>
        ))}
      </div>
    </div>
  );
}

function DetailsTab({ d }: { d: Detail }) {
  const upd = useAct(useServerFn(updateEventDetails), "Details saved");
  const [name, setName] = useState(d.event.name);
  const [start, setStart] = useState(toLocalInput(d.event.starts_at));
  const [end, setEnd] = useState(toLocalInput(d.event.ends_at));
  return (
    <form className="glass-panel grid max-w-2xl gap-4 rounded-xl p-5 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      upd.mutate({ id: d.event.id, name, startsAt: fromLocalInput(start), endsAt: fromLocalInput(end) });
    }}>
      <div className="space-y-1.5 sm:col-span-2"><Label>Event name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div className="space-y-1.5"><Label>Starts</Label><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required /></div>
      <div className="space-y-1.5"><Label>Ends</Label><Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required /></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={upd.isPending}>Save details</Button></div>
    </form>
  );
}
