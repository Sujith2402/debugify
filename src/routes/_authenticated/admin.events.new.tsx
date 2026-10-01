import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Calendar as CalendarIcon, Code2, ListChecks, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createEvent, listParticipants } from "@/lib/admin.functions";
import { MCQ_QUESTION_COUNT, formatDateTime } from "@/lib/debugify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CodingForm, McqForm, emptyCoding, emptyMcq, fromLocalInput, type CodingDraft, type McqDraft } from "@/components/admin/QuestionForms";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/events/new")({
  component: NewEvent,
});

const STEPS = ["Event type", "Details", "Participants", "Questions", "Review"];

function NewEvent() {
  const navigate = useNavigate();
  const fetchParts = useServerFn(listParticipants);
  const create = useServerFn(createEvent);
  const { data: people } = useQuery({ queryKey: ["participants"], queryFn: () => fetchParts() });
  const [step, setStep] = useState(0);
  const [type, setType] = useState<"MCQ" | "CODING" | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [mcq, setMcq] = useState<McqDraft[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [coding, setCoding] = useState<Partial<Record<CodingDraft["difficulty"], CodingDraft>>>({});

  const startsAt = date && start ? fromLocalInput(`${date}T${start}`) : "";
  const endsAt = date && end ? fromLocalInput(`${date}T${end}`) : "";
  const eligible = (people ?? []).filter((p) => p.is_active && (type !== "CODING" || p.shortlisted));
  const filtered = eligible.filter((p) => {
    const s = search.toLowerCase();
    return !s || p.participant_code?.toLowerCase().includes(s) || p.full_name.toLowerCase().includes(s);
  });

  const canNext = [
    !!type,
    name.trim().length >= 2 && !!startsAt && !!endsAt && endsAt > startsAt,
    true,
    true,
    true,
  ][step];

  const m = useMutation({
    mutationFn: () =>
      create({ data: {
        type: type!, name, startsAt, endsAt, participantIds: [...selected],
        mcq: type === "MCQ" ? mcq : [],
        coding: type === "CODING" ? Object.values(coding).filter(Boolean) as CodingDraft[] : [],
      } }),
    onSuccess: (r) => { toast.success("Event saved as draft"); navigate({ to: "/admin/events/$id", params: { id: r.id } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">New event</h1>
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("rounded-full border px-3 py-1 text-xs",
            i === step ? "border-neon-cyan text-neon-cyan" : i < step ? "border-neon-lime/60 text-neon-lime" : "text-muted-foreground")}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="glass-panel rounded-xl p-6">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {([["MCQ", "MCQ Event", "20 questions · 2 marks each · 40 max", ListChecks], ["CODING", "Coding Event", "Easy, Medium, Hard · 3 marks per test case · 150 max", Code2]] as const).map(([v, label, sub, Icon]) => (
              <button key={v} type="button" onClick={() => setType(v)}
                className={cn("rounded-xl border p-5 text-left transition hover:border-neon-cyan", type === v && "border-neon-pink bg-accent")}>
                <Icon className="h-6 w-6 text-neon-pink" />
                <p className="mt-3 font-display text-lg font-bold">{label}</p>
                <p className="text-sm text-muted-foreground">{sub}</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Event name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Debugify Round 1" />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Event Date</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-80 justify-start text-left font-normal h-11 border-border/80",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-neon-cyan" />
                      {date ? format(new Date(`${date}T00:00:00`), "PPP") : <span>Click to choose event date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date ? new Date(`${date}T00:00:00`) : undefined}
                      onSelect={(d) => setDate(d ? format(d, "yyyy-MM-dd") : "")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs"
                    onClick={() => setDate(format(new Date(), "yyyy-MM-dd"))}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setDate(format(tomorrow, "yyyy-MM-dd"));
                    }}
                  >
                    Tomorrow
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>End time</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-11" />
            </div>
            {startsAt && endsAt && endsAt <= startsAt && (
              <p className="text-sm text-destructive sm:col-span-2">End time must be after start time.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {type === "CODING" && <p className="text-sm text-muted-foreground">Only participants shortlisted from an MCQ round can be assigned.</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Input className="max-w-xs" placeholder="Search participants" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set(eligible.map((p) => p.id)))}>Select all</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
              <span className="ml-auto text-sm text-muted-foreground">{selected.size} selected</span>
            </div>
            <div className="max-h-96 divide-y divide-border overflow-y-auto rounded-lg border">
              {filtered.length === 0 && <p className="p-4 text-sm text-muted-foreground">No eligible participants. You can assign them later too.</p>}
              {filtered.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-accent">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={(c) => {
                    const n = new Set(selected); c ? n.add(p.id) : n.delete(p.id); setSelected(n);
                  }} />
                  <span className="font-mono-code text-sm">{p.participant_code}</span>
                  <span>{p.full_name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && type === "MCQ" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{mcq.length} of {MCQ_QUESTION_COUNT} questions added. You can also finish them later from the event page.</p>
            <ol className="space-y-2">
              {mcq.map((q, i) => editIdx === i ? (
                <li key={i} className="rounded-lg border p-4">
                  <McqForm initial={q} onCancel={() => setEditIdx(null)} onSave={(nq) => { const c = [...mcq]; c[i] = nq; setMcq(c); setEditIdx(null); }} />
                </li>
              ) : (
                <li key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <span className="font-mono-code text-sm text-neon-cyan">Q{i + 1}</span>
                  <span className="flex-1 text-sm">{q.question} <span className="text-neon-lime">({q.correct_option})</span></span>
                  <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditIdx(i)}><Pencil /></Button>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setMcq(mcq.filter((_, j) => j !== i))}><Trash2 /></Button>
                </li>
              ))}
            </ol>
            {mcq.length < MCQ_QUESTION_COUNT && editIdx === null && (
              <div className="rounded-lg border border-dashed p-4">
                <p className="mb-3 font-medium">Question {mcq.length + 1}</p>
                <McqForm key={mcq.length} initial={emptyMcq()} saveLabel="Add question" onSave={(q) => setMcq([...mcq, q])} />
              </div>
            )}
          </div>
        )}

        {step === 3 && type === "CODING" && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Add one question per difficulty. Test cases (15 / 15 / 20) are added on the event page after saving.</p>
            {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
              <div key={d} className="rounded-lg border p-4">
                <p className="mb-3 font-display font-bold">{d}{coding[d] && <span className="ml-2 text-sm text-neon-lime">✓ {coding[d]!.title}</span>}</p>
                <CodingForm initial={coding[d] ?? emptyCoding(d)} saveLabel={coding[d] ? "Update" : "Save"}
                  onSave={(q) => { setCoding({ ...coding, [d]: q }); toast.success(`${d} question saved`); }} />
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row k="Type" v={type ?? ""} />
            <Row k="Name" v={name} />
            <Row k="Starts" v={startsAt ? formatDateTime(startsAt) : ""} />
            <Row k="Ends" v={endsAt ? formatDateTime(endsAt) : ""} />
            <Row k="Participants" v={String(selected.size)} />
            <Row k="Questions" v={type === "MCQ" ? `${mcq.length} / ${MCQ_QUESTION_COUNT}` : `${Object.keys(coding).length} / 3`} />
            <p className="text-muted-foreground sm:col-span-2">The event is saved as a draft. Schedule it from the event page once everything is complete.</p>
          </dl>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        {step < 4 ? (
          <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Next</Button>
        ) : (
          <Button disabled={m.isPending} onClick={() => m.mutate()}>{m.isPending ? "Saving…" : "Create event"}</Button>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v || "—"}</dd>
    </div>
  );
}
