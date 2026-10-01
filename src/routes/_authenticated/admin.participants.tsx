import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { createParticipant, listParticipants, resetParticipantPassword, updateParticipant } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/admin/participants")({
  component: ParticipantsPage,
});

type P = Awaited<ReturnType<typeof listParticipants>>[number];

function ParticipantsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listParticipants);
  const { data, isLoading } = useQuery({ queryKey: ["participants"], queryFn: () => fetchList() });
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<P | null>(null);
  const [resetting, setResetting] = useState<P | null>(null);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((p) => !s || [p.participant_code, p.full_name, p.email].some((v) => v?.toLowerCase().includes(s)));
  }, [data, q]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["participants"] });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Participants</h1>
          <p className="text-sm text-muted-foreground">Create login IDs and passwords for your participants.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus /> New participant</Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search ID, name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="glass-panel overflow-x-auto rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead>
              <TableHead>MCQ</TableHead><TableHead>Coding</TableHead><TableHead>Status</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No participants yet.</TableCell></TableRow>
            )}
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono-code">{p.participant_code}</TableCell>
                <TableCell>{p.full_name}{p.shortlisted && <span className="ml-2 text-xs text-neon-lime">★ shortlisted</span>}</TableCell>
                <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                <TableCell><StatusBadge value={p.mcqStatus} /></TableCell>
                <TableCell><StatusBadge value={p.codingStatus} /></TableCell>
                <TableCell><StatusBadge value={p.is_active ? "ACTIVE" : "DISABLED"} /></TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(p)}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label="Reset password" onClick={() => setResetting(p)}><KeyRound /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <CreateDialog open={creating} onClose={() => setCreating(false)} onDone={refresh} />
      {editing && <EditDialog p={editing} onClose={() => setEditing(null)} onDone={refresh} />}
      {resetting && <ResetDialog p={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}

function CreateDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const create = useServerFn(createParticipant);
  const [f, setF] = useState({ participantCode: "", fullName: "", email: "", password: "" });
  const m = useMutation({
    mutationFn: () => create({ data: f }),
    onSuccess: () => {
      toast.success(`Participant ${f.participantCode.toUpperCase()} created`);
      setF({ participantCode: "", fullName: "", email: "", password: "" });
      onDone(); onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New participant</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <Field label="Participant ID" value={f.participantCode} onChange={(v) => setF({ ...f, participantCode: v })} placeholder="e.g. DBG001" required />
          <Field label="Full name" value={f.fullName} onChange={(v) => setF({ ...f, fullName: v })} required />
          <Field label="Email (optional)" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} />
          <Field label="Password (min 6)" value={f.password} onChange={(v) => setF({ ...f, password: v })} required />
          <DialogFooter><Button type="submit" disabled={m.isPending}>{m.isPending ? "Creating…" : "Create"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ p, onClose, onDone }: { p: P; onClose: () => void; onDone: () => void }) {
  const update = useServerFn(updateParticipant);
  const [f, setF] = useState({ fullName: p.full_name, email: p.email ?? "", isActive: p.is_active });
  const m = useMutation({
    mutationFn: () => update({ data: { id: p.id, ...f } }),
    onSuccess: () => { toast.success("Saved"); onDone(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {p.participant_code}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <Field label="Full name" value={f.fullName} onChange={(v) => setF({ ...f, fullName: v })} required />
          <Field label="Email (optional)" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} />
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><p className="text-sm font-medium">Account active</p><p className="text-xs text-muted-foreground">Disabled participants cannot sign in.</p></div>
            <Switch checked={f.isActive} onCheckedChange={(v) => setF({ ...f, isActive: v })} />
          </div>
          <DialogFooter><Button type="submit" disabled={m.isPending}>Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ p, onClose }: { p: P; onClose: () => void }) {
  const reset = useServerFn(resetParticipantPassword);
  const [pw, setPw] = useState("");
  const m = useMutation({
    mutationFn: () => reset({ data: { id: p.id, password: pw } }),
    onSuccess: () => { toast.success("Password updated"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset password — {p.participant_code}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <Field label="New password (min 6)" value={pw} onChange={setPw} required />
          <DialogFooter><Button type="submit" disabled={m.isPending || pw.length < 6}>Update password</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} required={required} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
