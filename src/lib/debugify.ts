// Browser-safe constants and helpers shared by client and server.
export type EventType = "MCQ" | "CODING";
export type EventStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
export type WindowState = "NOT_STARTED" | "AVAILABLE" | "CLOSED";

export const MCQ_QUESTION_COUNT = 20;
export const MCQ_MARKS_PER_QUESTION = 2;
export const MARKS_PER_TEST_CASE = 3;

export function participantEmail(code: string) {
  const norm = code.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${norm}@debugify.local`;
}

export function windowState(startsAt: string, endsAt: string, now = Date.now()): WindowState {
  if (now < new Date(startsAt).getTime()) return "NOT_STARTED";
  if (now > new Date(endsAt).getTime()) return "CLOSED";
  return "AVAILABLE";
}

export const windowLabel: Record<WindowState, string> = {
  NOT_STARTED: "Test Not Started",
  AVAILABLE: "Test Available",
  CLOSED: "Test Closed",
};

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
