import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type McqDraft = {
  question: string; option_a: string; option_b: string; option_c: string; option_d: string;
  correct_option: "A" | "B" | "C" | "D"; marks: number;
};
export const emptyMcq = (): McqDraft => ({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "A", marks: 2 });

export type CodingDraft = {
  title: string; description: string; input_format: string; output_format: string; constraints: string;
  difficulty: "EASY" | "MEDIUM" | "HARD"; time_limit_ms: number; memory_limit_mb: number;
};
export const emptyCoding = (difficulty: CodingDraft["difficulty"]): CodingDraft => ({
  title: "", description: "", input_format: "", output_format: "", constraints: "", difficulty, time_limit_ms: 2000, memory_limit_mb: 256,
});

export function McqForm({ initial, onSave, onCancel, busy, saveLabel = "Save question" }: {
  initial: McqDraft; onSave: (q: McqDraft) => void; onCancel?: (() => void) | undefined; busy?: boolean; saveLabel?: string;
}) {
  const [q, setQ] = useState(initial);
  const opts = ["A", "B", "C", "D"] as const;
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(q); }}>
      <div className="space-y-1.5">
        <Label>Question</Label>
        <Textarea required value={q.question} onChange={(e) => setQ({ ...q, question: e.target.value })} />
      </div>
      <RadioGroup value={q.correct_option} onValueChange={(v) => setQ({ ...q, correct_option: v as McqDraft["correct_option"] })} className="space-y-2">
        {opts.map((o) => {
          const key = `option_${o.toLowerCase()}` as "option_a";
          return (
            <div key={o} className="flex items-center gap-3">
              <RadioGroupItem value={o} id={`correct-${o}`} aria-label={`Mark ${o} correct`} />
              <span className="w-5 font-mono-code text-sm">{o}</span>
              <Input required value={q[key]} onChange={(e) => setQ({ ...q, [key]: e.target.value })} placeholder={`Option ${o}`} />
            </div>
          );
        })}
      </RadioGroup>
      <p className="text-xs text-muted-foreground">Select the circle next to the correct answer. Each question carries 2 marks.</p>
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={busy}>{saveLabel}</Button>
      </div>
    </form>
  );
}

export function CodingForm({ initial, onSave, onCancel, busy, saveLabel = "Save question" }: {
  initial: CodingDraft; onSave: (q: CodingDraft) => void; onCancel?: (() => void) | undefined; busy?: boolean; saveLabel?: string;
}) {
  const [q, setQ] = useState(initial);
  const t = (k: keyof CodingDraft, label: string, rows = 3) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={rows} value={q[k] as string} onChange={(e) => setQ({ ...q, [k]: e.target.value })} />
    </div>
  );
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(q); }}>
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input required value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value })} />
      </div>
      {t("description", "Problem description (include examples)", 5)}
      <div className="grid gap-3 md:grid-cols-2">
        {t("input_format", "Input format")}
        {t("output_format", "Output format")}
      </div>
      {t("constraints", "Constraints", 2)}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Time limit (ms)</Label>
          <Input type="number" min={500} max={10000} value={q.time_limit_ms} onChange={(e) => setQ({ ...q, time_limit_ms: Number(e.target.value) })} /></div>
        <div className="space-y-1.5"><Label>Memory limit (MB)</Label>
          <Input type="number" min={32} max={1024} value={q.memory_limit_mb} onChange={(e) => setQ({ ...q, memory_limit_mb: Number(e.target.value) })} /></div>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={busy}>{saveLabel}</Button>
      </div>
    </form>
  );
}

// datetime-local <-> ISO helpers
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(v: string) {
  return new Date(v).toISOString();
}
