import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarPlus } from "lucide-react";
import { listEvents } from "@/lib/admin.functions";
import { formatDateTime } from "@/lib/debugify";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/admin/events/")({
  component: EventsPage,
});

function EventsPage() {
  const fetchEvents = useServerFn(listEvents);
  const { data, isLoading } = useQuery({ queryKey: ["events"], queryFn: () => fetchEvents() });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground">MCQ and coding rounds, their schedule and status.</p>
        </div>
        <Button asChild><Link to="/admin/events/new"><CalendarPlus /> New event</Link></Button>
      </div>
      <div className="glass-panel overflow-x-auto rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Starts</TableHead><TableHead>Ends</TableHead>
              <TableHead>Questions</TableHead><TableHead>Participants</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && !data?.length && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No events yet.</TableCell></TableRow>
            )}
            {data?.map((e) => (
              <TableRow key={e.id}>
                <TableCell><Link to="/admin/events/$id" params={{ id: e.id }} className="font-medium hover:text-neon-cyan">{e.name}</Link></TableCell>
                <TableCell><StatusBadge value={e.type} /></TableCell>
                <TableCell className="text-sm">{formatDateTime(e.starts_at)}</TableCell>
                <TableCell className="text-sm">{formatDateTime(e.ends_at)}</TableCell>
                <TableCell>{e.questions}{e.type === "MCQ" ? " / 20" : " / 3"}</TableCell>
                <TableCell>{e.participants}</TableCell>
                <TableCell><StatusBadge value={e.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
