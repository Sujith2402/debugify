import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyAssignedEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const { getPrivilegedClient } = await import("@/integrations/supabase/client.server");
    const privClient = await getPrivilegedClient();

    const email = typeof claims.email === "string" ? claims.email : "";
    const participantCode = email.endsWith("@debugify.local")
      ? email.slice(0, -"@debugify.local".length)
      : "";
    const userIds = new Set([userId]);
    if (participantCode) {
      const { findParticipantByCode } = await import("@/lib/participants.store");
      const storedParticipant = findParticipantByCode(participantCode);
      if (storedParticipant) userIds.add(storedParticipant.id);
    }

    const { data: assignments } = await privClient
      .from("event_participants")
      .select("event_id, status")
      .in("user_id", [...userIds]);

    let targetEvents: any[] = [];
    const assignMap = new Map((assignments ?? []).map((a) => [a.event_id, a.status]));

    if (assignments && assignments.length > 0) {
      const eventIds = assignments.map((a) => a.event_id);
      const { data: eventsList } = await privClient
        .from("events")
        .select("*")
        .in("id", eventIds)
        .order("starts_at", { ascending: false });
      targetEvents = eventsList ?? [];
    } else {
      const { data: allEvents } = await privClient
        .from("events")
        .select("*")
        .order("starts_at", { ascending: false });
      targetEvents = allEvents ?? [];
    }

    if (!targetEvents.length) return [];

    const eventIds = targetEvents.map((e) => e.id);
    const [mcqAttempts, codingAttempts] = await Promise.all([
      privClient.from("mcq_attempts").select("*").in("event_id", eventIds).eq("user_id", userId),
      privClient.from("coding_attempts").select("*").in("event_id", eventIds).eq("user_id", userId),
    ]);

    const mcqMap = new Map((mcqAttempts.data ?? []).map((m) => [m.event_id, m]));
    const codingMap = new Map((codingAttempts.data ?? []).map((c) => [c.event_id, c]));

    return targetEvents.map((ev) => {
      const attempt = ev.type === "MCQ" ? mcqMap.get(ev.id) : codingMap.get(ev.id);
      return {
        ...ev,
        assignmentStatus: assignMap.get(ev.id) ?? (attempt?.status === "SUBMITTED" ? "SUBMITTED" : "ASSIGNED"),
        attempt: attempt ?? null,
      };
    });
  });

export const getEventAssessment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { getPrivilegedClient } = await import("@/integrations/supabase/client.server");
    const privClient = await getPrivilegedClient();

    const [evRes, mcqRes, codingRes] = await Promise.all([
      privClient.from("events").select("*").eq("id", data.eventId).single(),
      privClient.from("mcq_questions").select("id, question, option_a, option_b, option_c, option_d, marks, position").eq("event_id", data.eventId).order("position"),
      privClient.from("coding_questions").select("id, title, description, difficulty, input_format, output_format, constraints, time_limit_ms, memory_limit_mb, marks_per_case, position").eq("event_id", data.eventId).order("position"),
    ]);

    return {
      event: evRes.data,
      mcqQuestions: mcqRes.data ?? [],
      codingQuestions: codingRes.data ?? [],
    };
  });

// -------- Coding round assessment (participant view) --------
export const getCodingAssessment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { getPrivilegedClient } = await import("@/integrations/supabase/client.server");
    const privClient = await getPrivilegedClient();

    const [evRes, codingRes] = await Promise.all([
      privClient.from("events").select("*").eq("id", data.eventId).single(),
      privClient.from("coding_questions")
        .select("id, title, description, difficulty, input_format, output_format, constraints, time_limit_ms, memory_limit_mb, marks_per_case, position")
        .eq("event_id", data.eventId)
        .order("position"),
    ]);

    const qids = (codingRes.data ?? []).map((q: any) => q.id);

    // Only fetch sample (visible) test cases for participants
    const sampleRes = qids.length
      ? await privClient
          .from("coding_test_cases")
          .select("id, question_id, input, expected_output, is_sample, position")
          .in("question_id", qids)
          .eq("is_sample", true)
          .order("position")
      : { data: [] };

    return {
      event: evRes.data,
      codingQuestions: codingRes.data ?? [],
      sampleCases: sampleRes.data ?? [],
    };
  });

// -------- Code execution: Wandbox real compiler (C, C++, Java, Python) --------
// Wandbox is a free, no-auth-needed online compiler. Compiler IDs confirmed working 2026.
const WANDBOX_COMPILER: Record<string, string> = {
  c:      "gcc-head",           // Real GCC — supports #include <stdio.h>, scanf, printf
  cpp:    "gcc-head",           // Real G++ — supports #include <iostream>, cin, cout
  java:   "openjdk-jdk-21+35",  // OpenJDK 21
  python: "cpython-3.12.7",     // CPython 3.12
};

// Wandbox rejects "public class Foo" if the filename doesn't match.
// We strip the "public" modifier from the top-level class so javac is happy.
function normaliseJavaCode(code: string): string {
  return code.replace(/^(\s*)public\s+(class\s)/m, "$1$2");
}

type WandboxResult = {
  stdout: string;
  stderr: string;
  compileError?: string;
  timeMs: number;
};

async function executeViaWandbox(
  code: string,
  language: string,
  stdin: string,
  _timeLimitMs = 3000,
): Promise<WandboxResult> {
  const compiler = WANDBOX_COMPILER[language];
  if (!compiler) throw new Error(`Unsupported language: ${language}`);

  const sourceCode = language === "java" ? normaliseJavaCode(code) : code;
  const start = Date.now();

  let res: Response;
  try {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 30_000);
    res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compiler, code: sourceCode, stdin }),
      signal: controller.signal,
    });
    clearTimeout(to);
  } catch (err: any) {
    const timeMs = Date.now() - start;
    if (err?.name === "AbortError") {
      return { stdout: "", stderr: "Time Limit Exceeded", compileError: "TLE: execution timed out", timeMs };
    }
    throw err;
  }

  const timeMs = Date.now() - start;
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`Wandbox error ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json = await res.json() as {
    status: string;
    program_output: string;
    program_error: string;
    compiler_error: string;
    signal: string;
  };

  const compileErr = (json.compiler_error ?? "").trim();
  const programErr = (json.program_error ?? "").trim();
  const stdout     = (json.program_output ?? "").trim();

  if (compileErr) return { stdout: "", stderr: compileErr, compileError: compileErr, timeMs };
  if (json.status !== "0") {
    const rte = programErr || json.signal || "Runtime Error";
    return { stdout, stderr: rte, compileError: rte, timeMs };
  }
  return { stdout, stderr: programErr, timeMs };
}


function checkCompilation(code: string, language: string): { valid: boolean; error?: string } {
  const trimmed = code.trim();
  if (!trimmed || trimmed.length < 15) {
    return { valid: false, error: "Empty solution. Please write your code before running." };
  }
  if (language === "c" || language === "cpp") {
    if (!trimmed.includes("main")) {
      return { valid: false, error: "Compilation error: undefined reference to 'main'. C/C++ requires a main() function." };
    }
  }
  if (language === "java") {
    if (!trimmed.includes("class") || !trimmed.includes("main")) {
      return { valid: false, error: "Compilation error: Main method not found. Java requires a class with 'public static void main(String[] args)'." };
    }
  }
  return { valid: true };
}

function mockExecute(
  code: string,
  expectedOutput: string,
): { passed: boolean; timeMs: number } {
  const hasCode = code.trim().length > 50;
  const passed = hasCode && Math.random() > 0.35;
  return { passed, timeMs: Math.floor(Math.random() * 180) + 40 };
}

export const runCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      code: z.string().max(100_000),
      language: z.enum(["python", "cpp", "c", "java"]),
      testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })).max(10),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const syntaxCheck = checkCompilation(data.code, data.language);
    if (!syntaxCheck.valid) {
      return { status: "CE" as const, error: syntaxCheck.error!, results: [], passedCount: 0, totalCount: data.testCases.length };
    }

    const results: Array<{
      input: string; expected: string; actual: string; passed: boolean; executionTimeMs?: number;
    }> = [];
    let compileError = "";

    // Run each sample test case through Wandbox (real compiler)
    for (const tc of data.testCases) {
      try {
        const res = await executeViaWandbox(data.code, data.language, tc.input, 5000);
        if (res.compileError) {
          compileError = res.compileError;
          break;
        }
        const actual = res.stdout;
        results.push({
          input: tc.input,
          expected: tc.expectedOutput.trim(),
          actual,
          passed: actual === tc.expectedOutput.trim(),
          executionTimeMs: res.timeMs,
        });
      } catch (err: any) {
        compileError = err?.message ?? "Execution error";
        break;
      }
    }

    if (compileError) {
      return { status: "CE" as const, error: compileError, results: [], passedCount: 0, totalCount: data.testCases.length };
    }

    const passedCount = results.filter((r) => r.passed).length;
    return {
      status: (passedCount === results.length && results.length > 0 ? "AC" : "WA") as "AC" | "WA",
      results,
      passedCount,
      totalCount: results.length,
      output: results.map((r) => r.actual).join("\n"),
    };
  });

// -------- Submit coding test (server-side evaluation of ALL test cases) --------
// Scoring: EASY 20 cases × 2 = 40pts, MEDIUM 20 × 2 = 40pts, HARD 10 × 2 = 20pts → 100 total
const CODING_MARKS: Record<string, { marksEach: number }> = {
  EASY:   { marksEach: 2 },
  MEDIUM: { marksEach: 2 },
  HARD:   { marksEach: 2 },
};

export const submitCodingTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      eventId: z.string().uuid(),
      submissions: z.array(z.object({
        questionId: z.string().uuid(),
        code: z.string().max(100_000),
        language: z.enum(["python", "cpp", "c", "java"]),
      })).max(3),
      durationSeconds: z.number().int().min(0),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { getPrivilegedClient } = await import("@/integrations/supabase/client.server");
    const privClient = await getPrivilegedClient();

    // Guard against re-submission
    const { data: existing } = await privClient
      .from("coding_attempts")
      .select("id, status")
      .eq("event_id", data.eventId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing?.status === "SUBMITTED") throw new Error("You have already submitted this coding round.");

    const { data: questions } = await privClient
      .from("coding_questions")
      .select("id, difficulty, time_limit_ms")
      .eq("event_id", data.eventId);

    const qs = questions ?? [];
    const qids = qs.map((q: any) => q.id);
    const { data: allCases } = qids.length
      ? await privClient.from("coding_test_cases").select("*").in("question_id", qids).order("position")
      : { data: [] };

    // Mark attempt as IN_PROGRESS
    const { data: attemptRow } = await privClient.from("coding_attempts").upsert({
      user_id: userId, event_id: data.eventId, status: "IN_PROGRESS",
      started_at: new Date().toISOString(), total_score: 0, total_passed: 0,
    }, { onConflict: "user_id,event_id" }).select("id").single();
    const attemptId = attemptRow?.id ?? crypto.randomUUID();

    let totalScore = 0;
    let totalPassed = 0;
    const byDiff: Record<string, { score: number; passed: number }> = {};

    for (const sub of data.submissions) {
      const q = qs.find((x: any) => x.id === sub.questionId);
      if (!q) continue;

      const cases = (allCases ?? []).filter((c: any) => c.question_id === sub.questionId);
      const cfg = CODING_MARKS[q.difficulty] ?? { marksEach: 2 };
      let qPassed = 0;

      const syntax = checkCompilation(sub.code, sub.language);
      if (!syntax.valid) {
        byDiff[q.difficulty] = { score: 0, passed: 0 };
        await privClient.from("coding_submissions").upsert({
          attempt_id: attemptId,
          user_id: userId, event_id: data.eventId, question_id: sub.questionId,
          language: sub.language, code: sub.code,
          score: 0, passed_count: 0, total_count: cases.length,
          verdict: "CE",
        }, { onConflict: "user_id,question_id" });
        continue;
      }

      for (const tc of cases) {
        try {
          const res = await executeViaWandbox(sub.code, sub.language, tc.input, q.time_limit_ms ?? 3000);
          const passed = !res.compileError && res.stdout.trim() === tc.expected_output.trim();
          if (passed) qPassed++;
        } catch { /* continue on individual test case error */ }
      }

      const qScore = qPassed * cfg.marksEach;
      totalScore  += qScore;
      totalPassed += qPassed;
      byDiff[q.difficulty] = { score: qScore, passed: qPassed };

      await privClient.from("coding_submissions").upsert({
        attempt_id: attemptId,
        user_id: userId, event_id: data.eventId, question_id: sub.questionId,
        language: sub.language, code: sub.code,
        score: qScore, passed_count: qPassed, total_count: cases.length,
        verdict: "SUBMITTED",
      }, { onConflict: "user_id,question_id" });
    }

    // Finalise attempt
    await privClient.from("coding_attempts").upsert({
      user_id: userId, event_id: data.eventId,
      status: "SUBMITTED", total_score: totalScore, total_passed: totalPassed,
      duration_seconds: data.durationSeconds, submitted_at: new Date().toISOString(),
    }, { onConflict: "user_id,event_id" });

    await privClient.from("event_participants").upsert({
      user_id: userId, event_id: data.eventId, status: "SUBMITTED",
    }, { onConflict: "user_id,event_id" });

    return { totalScore, totalPassed, byDiff };
  });

// -------- Published results (shown on student portal after admin publishes) --------
export const getPublishedMcqResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getPrivilegedClient } = await import("@/integrations/supabase/client.server");
    const db = await getPrivilegedClient();

    const { data: events } = await db.from("events").select("id, name").eq("type", "MCQ").eq("results_published", true);
    if (!events?.length) return [];

    const eventIds = events.map((e: any) => e.id);
    const [attRes, profRes] = await Promise.all([
      db.from("mcq_attempts").select("user_id, event_id, score, duration_seconds, correct_count, submitted_at").in("event_id", eventIds).eq("status", "SUBMITTED"),
      db.from("profiles").select("id, participant_code, full_name"),
    ]);

    const profMap = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));
    const evMap   = new Map((events ?? []).map((e: any) => [e.id, e]));

    const rows = (attRes.data ?? []).map((a: any) => ({
      ...a, profile: profMap.get(a.user_id) ?? null, event: evMap.get(a.event_id) ?? null,
    }));
    rows.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0) || (a.duration_seconds ?? Infinity) - (b.duration_seconds ?? Infinity));
    return rows;
  });

export const getPublishedCodingResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getPrivilegedClient } = await import("@/integrations/supabase/client.server");
    const db = await getPrivilegedClient();

    const { data: events } = await db.from("events").select("id, name").eq("type", "CODING").eq("results_published", true);
    if (!events?.length) return [];

    const eventIds = events.map((e: any) => e.id);
    const [attRes, profRes, qRes] = await Promise.all([
      db.from("coding_attempts").select("user_id, event_id, total_score, total_passed, duration_seconds, submitted_at").in("event_id", eventIds).eq("status", "SUBMITTED"),
      db.from("profiles").select("id, participant_code, full_name"),
      db.from("coding_questions").select("id, event_id, difficulty").in("event_id", eventIds),
    ]);

    const qids = (qRes.data ?? []).map((q: any) => q.id);
    const { data: subs } = qids.length
      ? await db.from("coding_submissions").select("user_id, question_id, event_id, score, passed_count").in("question_id", qids)
      : { data: [] };

    const profMap = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));
    const evMap   = new Map((events ?? []).map((e: any) => [e.id, e]));
    const qMap    = new Map((qRes.data ?? []).map((q: any) => [q.id, q]));

    const rows = (attRes.data ?? []).map((a: any) => {
      const mySubs = (subs ?? []).filter((r: any) => r.user_id === a.user_id && r.event_id === a.event_id);
      const byDiff: Record<string, { score: number; passed: number }> = {};
      for (const r of mySubs) {
        const q = qMap.get(r.question_id);
        if (q) byDiff[q.difficulty] = { score: r.score, passed: r.passed_count };
      }
      return { ...a, profile: profMap.get(a.user_id) ?? null, event: evMap.get(a.event_id) ?? null, byDiff };
    });

    rows.sort((a: any, b: any) => (b.total_score ?? 0) - (a.total_score ?? 0) || (b.total_passed ?? 0) - (a.total_passed ?? 0) || (a.duration_seconds ?? Infinity) - (b.duration_seconds ?? Infinity));
    return rows;
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
    const { userId } = context;
    const { getPrivilegedClient } = await import("@/integrations/supabase/client.server");
    const privClient = await getPrivilegedClient();

    const { data: questions } = await privClient
      .from("mcq_questions")
      .select("id, correct_option, marks")
      .eq("event_id", data.eventId);

    const qs = questions ?? [];
    let score = 0, correctCount = 0, wrongCount = 0, unansweredCount = 0;

    for (const q of qs) {
      const chosen = data.answers[q.id];
      if (!chosen) { unansweredCount++; }
      else if (chosen.toLowerCase() === (q.correct_option ?? "").toLowerCase()) { correctCount++; score += q.marks ?? 2; }
      else { wrongCount++; }
    }

    const { data: attempt, error: attemptErr } = await privClient
      .from("mcq_attempts")
      .upsert({
        user_id: userId, event_id: data.eventId, score,
        answers: data.answers, correct_count: correctCount,
        wrong_count: wrongCount, unanswered_count: unansweredCount,
        duration_seconds: data.durationSeconds, status: "SUBMITTED",
        submitted_at: new Date().toISOString(),
      }, { onConflict: "user_id,event_id" })
      .select().maybeSingle();

    if (attemptErr) console.error("[submitMcqTest]", attemptErr);

    await privClient.from("event_participants").upsert({
      user_id: userId, event_id: data.eventId, status: "SUBMITTED",
    }, { onConflict: "user_id,event_id" });

    return { ok: true, score, totalQuestions: qs.length, correctCount, wrongCount, unansweredCount, attempt };
  });
