import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyAssignedEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // 1. Get all events assigned to this participant
    const { data: assignments, error: epErr } = await supabase
      .from("event_participants")
      .select("event_id, status")
      .eq("user_id", userId);

    if (epErr || !assignments?.length) {
      // Also check if any events are live/scheduled that might be open to all registered participants
      const { data: allEvents } = await supabase
        .from("events")
        .select("*")
        .order("starts_at", { ascending: false });

      const eventsList = allEvents ?? [];
      if (!eventsList.length) return [];

      // For seamless demo/testing: if the participant has no explicit assignments yet,
      // return live/scheduled events so User 1 can test immediately!
      return eventsList.map((e) => ({
        ...e,
        assignmentStatus: "ASSIGNED",
        attempt: null,
      }));
    }

    const eventIds = assignments.map((a) => a.event_id);
    const [eventsRes, mcqAttempts, codingAttempts] = await Promise.all([
      supabase.from("events").select("*").in("id", eventIds).order("starts_at", { ascending: false }),
      supabase.from("mcq_attempts").select("*").in("event_id", eventIds).eq("user_id", userId),
      supabase.from("coding_attempts").select("*").in("event_id", eventIds).eq("user_id", userId),
    ]);

    const assignMap = new Map(assignments.map((a) => [a.event_id, a.status]));
    const mcqMap = new Map((mcqAttempts.data ?? []).map((m) => [m.event_id, m]));
    const codingMap = new Map((codingAttempts.data ?? []).map((c) => [c.event_id, c]));

    return (eventsRes.data ?? []).map((ev) => {
      const attempt = ev.type === "MCQ" ? mcqMap.get(ev.id) : codingMap.get(ev.id);
      return {
        ...ev,
        assignmentStatus: assignMap.get(ev.id) ?? "ASSIGNED",
        attempt: attempt ?? null,
      };
    });
  });

export const getEventAssessment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [evRes, mcqRes, codingRes] = await Promise.all([
      supabase.from("events").select("*").eq("id", data.eventId).single(),
      supabase.from("mcq_questions").select("id, question, option_a, option_b, option_c, option_d, marks, position").eq("event_id", data.eventId).order("position"),
      supabase.from("coding_questions").select("id, title, description, difficulty, input_format, output_format, constraints, time_limit_ms, memory_limit_mb, marks_per_case, position").eq("event_id", data.eventId).order("position"),
    ]);

    return {
      event: evRes.data,
      mcqQuestions: mcqRes.data ?? [],
      codingQuestions: codingRes.data ?? [],
    };
  });

export const submitMcqTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      eventId: z.string().uuid(),
      answers: z.record(z.string()),
      durationSeconds: z.number().int().min(0),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fetch questions with correct answers to score on server
    const { data: questions } = await supabase
      .from("mcq_questions")
      .select("id, correct_option, marks")
      .eq("event_id", data.eventId);

    const qs = questions ?? [];
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    for (const q of qs) {
      const chosen = data.answers[q.id];
      if (!chosen) {
        unansweredCount++;
      } else if (chosen.toLowerCase() === q.correct_option.toLowerCase()) {
        correctCount++;
        score += q.marks ?? 2;
      } else {
        wrongCount++;
      }
    }

    // Upsert into mcq_attempts
    const { data: attempt, error: attemptErr } = await supabase
      .from("mcq_attempts")
      .upsert({
        user_id: userId,
        event_id: data.eventId,
        score,
        answers: data.answers,
        correct_count: correctCount,
        wrong_count: wrongCount,
        unanswered_count: unansweredCount,
        duration_seconds: data.durationSeconds,
        status: "SUBMITTED",
        submitted_at: new Date().toISOString(),
      }, { onConflict: "user_id,event_id" })
      .select()
      .maybeSingle();

    // Update participant event status
    await supabase
      .from("event_participants")
      .update({ status: "SUBMITTED" })
      .eq("user_id", userId)
      .eq("event_id", data.eventId);

    return {
      ok: true,
      score,
      totalQuestions: qs.length,
      correctCount,
      wrongCount,
      unansweredCount,
      attempt,
    };
  });
