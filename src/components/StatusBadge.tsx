import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  DRAFT: "border-muted-foreground/40 text-muted-foreground",
  SCHEDULED: "border-neon-cyan/50 text-neon-cyan",
  LIVE: "border-neon-lime/60 text-neon-lime",
  COMPLETED: "border-primary/50 text-primary",
  CANCELLED: "border-destructive/60 text-destructive",
  SUBMITTED: "border-neon-lime/60 text-neon-lime",
  IN_PROGRESS: "border-neon-cyan/50 text-neon-cyan",
  NOT_STARTED: "border-muted-foreground/40 text-muted-foreground",
  ASSIGNED: "border-neon-cyan/40 text-neon-cyan",
  MISSED: "border-destructive/50 text-destructive",
  ACTIVE: "border-neon-lime/60 text-neon-lime",
  DISABLED: "border-destructive/60 text-destructive",
  MCQ: "border-neon-pink/50 text-neon-pink",
  CODING: "border-neon-cyan/50 text-neon-cyan",
  EASY: "border-neon-lime/50 text-neon-lime",
  MEDIUM: "border-neon-cyan/50 text-neon-cyan",
  HARD: "border-neon-pink/50 text-neon-pink",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("inline-block rounded border px-2 py-0.5 font-mono-code text-[11px] uppercase", tone[value] ?? "border-border text-muted-foreground", className)}>
      {value.replace("_", " ")}
    </span>
  );
}
