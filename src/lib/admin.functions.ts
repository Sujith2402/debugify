import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MCQ_QUESTION_COUNT, participantEmail } from "@/lib/debugify";

// Every coordinator function passes through this: signed-in + admin role verified on the server.
const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden: coordinator access only");
    let db = context.supabase;
    if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        db = supabaseAdmin;
      } catch {}
    }
    return next({ context: { db } });
  });

function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}

const CODING_CASES: Record<string, number> = { EASY: 20, MEDIUM: 20, HARD: 10 };

export const DEFAULT_CODING_QUESTIONS = {
  EASY: {
    title: "Sum of Two Numbers",
    description: "Read two space-separated integers a and b from standard input and print their sum to standard output.",
    input_format: "Two integers a and b (-10^6 <= a, b <= 10^6).",
    output_format: "A single integer denoting a + b.",
    constraints: "-10^6 <= a, b <= 10^6",
    difficulty: "EASY" as const,
    time_limit_ms: 2000,
    memory_limit_mb: 256,
  },
  MEDIUM: {
    title: "Count Vowels in String",
    description: "Given a single word or string s, count the total number of vowels ('a', 'e', 'i', 'o', 'u', case-insensitive) and print the count.",
    input_format: "A single line containing string s (1 <= length <= 1000).",
    output_format: "An integer representing the number of vowels in string s.",
    constraints: "1 <= length of s <= 1000",
    difficulty: "MEDIUM" as const,
    time_limit_ms: 2000,
    memory_limit_mb: 256,
  },
  HARD: {
    title: "Longest Unique Substring",
    description: "Given a string s, find the length of the longest substring without repeating characters.",
    input_format: "A single string s (1 <= length <= 10^4).",
    output_format: "An integer representing the length of the longest substring without repeating characters.",
    constraints: "1 <= length of s <= 10^4",
    difficulty: "HARD" as const,
    time_limit_ms: 2000,
    memory_limit_mb: 256,
  },
};

export async function ensureCodingQuestionTestCases(
  db: any,
  questionId: string,
  difficulty: "EASY" | "MEDIUM" | "HARD",
  existingCount = 0
) {
  const target = CODING_CASES[difficulty] ?? 20;
  if (existingCount >= target) return;

  const toAdd = target - existingCount;
  const newCases = [];
  for (let i = 0; i < toAdd; i++) {
    const pos = existingCount + i + 1;
    const isSample = pos <= 2;
    let input = "";
    let output = "";

    if (difficulty === "EASY") {
      const a = pos * 3;
      const b = pos * 7;
      input = `${a} ${b}`;
      output = `${a + b}`;
    } else if (difficulty === "MEDIUM") {
      const words = [
        "hello", "algorithm", "debugify", "programming", "code",
        "evaluation", "software", "development", "engineer", "framework",
        "database", "network", "system", "performance", "variable",
        "function", "binary", "solution", "computer", "architecture"
      ];
      const w = words[i % words.length] ?? "test";
      input = w;
      const vowels = (w.match(/[aeiou]/gi) || []).length;
      output = `${vowels}`;
    } else { // HARD
      const strs = [
        "abcabcbb", "bbbbb", "pwwkew", "abcdef", "aab",
        "dvdf", "tmmzuxt", "anviaj", "ckilbkd", "nfpdmfl"
      ];
      const s = strs[i % strs.length] ?? "abc";
      input = s;
      const charSet = new Set<string>();
      let l = 0, maxLen = 0;
      for (let r = 0; r < s.length; r++) {
        while (charSet.has(s[r]!)) { charSet.delete(s[l]!); l++; }
        charSet.add(s[r]!);
        maxLen = Math.max(maxLen, r - l + 1);
      }
      output = `${maxLen}`;
    }

    newCases.push({
      question_id: questionId,
      position: pos,
      input,
      expected_output: output,
      is_sample: isSample,
    });
  }

  if (newCases.length > 0) {
    await db.from("coding_test_cases").insert(newCases);
  }
}


// ---------- Overview ----------
export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context: { db } }) => {
    const [profiles, roles, events, mcq, coding] = await Promise.all([
      db.from("profiles").select("id, is_active"),
      db.from("user_roles").select("user_id").eq("role", "admin"),
      db.from("events").select("id, name, type, status, starts_at, ends_at").order("starts_at", { ascending: true }),
      db.from("mcq_attempts").select("status, score"),
      db.from("coding_attempts").select("status"),
    ]);
    const adminIds = new Set((roles.data ?? []).map((r) => r.user_id));
    const parts = (profiles.data ?? []).filter((p) => !adminIds.has(p.id));
    const mcqDone = (mcq.data ?? []).filter((a) => a.status === "SUBMITTED");
    const scores = mcqDone.map((a) => a.score ?? 0);
    const ev = events.data ?? [];
    return {
      totalParticipants: parts.length,
      activeParticipants: parts.filter((p) => p.is_active).length,
      totalEvents: ev.length,
      liveEvents: ev.filter((e) => e.status === "LIVE").length,
      mcqSubmitted: mcqDone.length,
      mcqInProgress: (mcq.data ?? []).length - mcqDone.length,
      codingSubmitted: (coding.data ?? []).filter((a) => a.status === "SUBMITTED").length,
      avgMcq: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
      topMcq: scores.length ? Math.max(...scores) : null,
      upcoming: ev.filter((e) => e.status !== "COMPLETED" && e.status !== "CANCELLED").slice(0, 5),
    };
  });

// ---------- Participants ----------
export const listParticipants = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context: { db } }) => {
    const { getRegisteredParticipants } = await import("@/lib/participants.store");
    const [profiles, roles, mcq, coding, shortlist] = await Promise.all([
      db.from("profiles").select("id, participant_code, full_name, email, is_active, created_at").order("created_at", { ascending: false }),
      db.from("user_roles").select("user_id").eq("role", "admin"),
      db.from("mcq_attempts").select("user_id, status"),
      db.from("coding_attempts").select("user_id, status"),
      db.from("shortlists").select("user_id"),
    ]);
    const adminIds = new Set((roles.data ?? []).map((r) => r.user_id));
    const last = (rows: { user_id: string; status: string }[] | null, id: string) =>
      rows?.find((r) => r.user_id === id)?.status ?? "—";
    const sl = new Set((shortlist.data ?? []).map((s) => s.user_id));

    const existingIds = new Set((profiles.data ?? []).map((p) => p.id));
    const allProfiles = [...(profiles.data ?? [])];
    for (const rp of getRegisteredParticipants()) {
      if (!existingIds.has(rp.id)) {
        allProfiles.push(rp);
      }
    }

    return allProfiles
      .filter((p) => !adminIds.has(p.id))
      .map((p) => ({
        ...p,
        mcqStatus: last(mcq.data, p.id),
        codingStatus: last(coding.data, p.id),
        shortlisted: sl.has(p.id) || (p as any).shortlisted || false,
      }));
  });

const codeSchema = z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dots or dashes");

export const createParticipant = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) =>
    z.object({
      participantCode: codeSchema,
      fullName: z.string().trim().min(2).max(100),
      email: z.string().trim().email().max(255).optional().or(z.literal("")),
      password: z.string().min(6).max(72),
    }).parse(d),
  )
  .handler(async ({ data, context: { db } }) => {
    const { registerCustomParticipant } = await import("@/lib/participants.store");
    const code = data.participantCode.toUpperCase();
    const id = "p-" + Math.random().toString(36).substring(2, 10) + "-" + Date.now();
    const newParticipant = {
      id,
      participant_code: code,
      full_name: data.fullName,
      email: data.email || participantEmail(code),
      is_active: true,
      created_at: new Date().toISOString(),
    };
    registerCustomParticipant(newParticipant);

    // Try saving to DB if service role or DB permits
    try {
      if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
        const { data: created } = await db.auth.admin.createUser({
          email: participantEmail(code),
          password: data.password,
          email_confirm: true,
        });
        if (created?.user) {
          await db.from("profiles").insert({ id: created.user.id, participant_code: code, full_name: data.fullName, email: data.email || null });
          await db.from("user_roles").insert({ user_id: created.user.id, role: "participant" });
        }
      }
    } catch {}

    return { id };
  });

export const updateParticipant = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) =>
    z.object({
      id: z.string().uuid(),
      fullName: z.string().trim().min(2).max(100),
      email: z.string().trim().email().max(255).optional().or(z.literal("")),
      isActive: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context: { db } }) => {
    const { data: isAdm } = await db.from("user_roles").select("id").eq("user_id", data.id).eq("role", "admin").maybeSingle();
    if (isAdm) throw new Error("Cannot edit a coordinator here");
    check(await db.from("profiles").update({ full_name: data.fullName, email: data.email || null, is_active: data.isActive }).eq("id", data.id));
    // Disabled participants are banned at the auth layer so they can't sign in at all.
    const ban = await db.auth.admin.updateUserById(data.id, { ban_duration: data.isActive ? "none" : "876000h" });
    if (ban.error) throw new Error(ban.error.message);
    return { ok: true };
  });

export const resetParticipantPassword = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ id: z.string().uuid(), password: z.string().min(6).max(72) }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const { data: isAdm } = await db.from("user_roles").select("id").eq("user_id", data.id).eq("role", "admin").maybeSingle();
    if (isAdm) throw new Error("Cannot reset a coordinator here");
    const r = await db.auth.admin.updateUserById(data.id, { password: data.password });
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

// ---------- Events ----------
export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context: { db } }) => {
    const [events, ep, mq, cq] = await Promise.all([
      db.from("events").select("*").order("starts_at", { ascending: false }),
      db.from("event_participants").select("event_id"),
      db.from("mcq_questions").select("event_id"),
      db.from("coding_questions").select("event_id"),
    ]);
    const count = (rows: { event_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.event_id === id).length;
    return (events.data ?? []).map((e) => ({
      ...e,
      participants: count(ep.data, e.id),
      questions: e.type === "MCQ" ? count(mq.data, e.id) : count(cq.data, e.id),
    }));
  });

const mcqQ = z.object({
  question: z.string().trim().min(1).max(2000),
  option_a: z.string().trim().min(1).max(500),
  option_b: z.string().trim().min(1).max(500),
  option_c: z.string().trim().min(1).max(500),
  option_d: z.string().trim().min(1).max(500),
  correct_option: z.enum(["A", "B", "C", "D"]),
  marks: z.number().int().min(1).max(10).default(2),
});
const codingQ = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).default(""),
  input_format: z.string().max(3000).default(""),
  output_format: z.string().max(3000).default(""),
  constraints: z.string().max(3000).default(""),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  time_limit_ms: z.number().int().min(500).max(10000).default(2000),
  memory_limit_mb: z.number().int().min(32).max(1024).default(256),
});

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) =>
    z.object({
      type: z.enum(["MCQ", "CODING"]),
      name: z.string().trim().min(2).max(150),
      startsAt: z.string().datetime({ offset: true }),
      endsAt: z.string().datetime({ offset: true }),
      status: z.enum(["DRAFT", "SCHEDULED", "LIVE"]).optional(),
      participantIds: z.array(z.string().uuid()).max(5000),
      mcq: z.array(mcqQ).max(MCQ_QUESTION_COUNT).default([]),
      coding: z.array(codingQ).max(3).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context: { db, userId } }) => {
    if (new Date(data.endsAt) <= new Date(data.startsAt)) throw new Error("End time must be after start time");

    const now = new Date();
    let initialStatus = data.status ?? "SCHEDULED";
    if (initialStatus === "SCHEDULED" && new Date(data.startsAt) <= now && new Date(data.endsAt) >= now) {
      initialStatus = "LIVE";
    }

    const ev = check(
      await db.from("events").insert({
        name: data.name,
        type: data.type,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
        status: initialStatus,
        created_by: userId,
      }).select("id").single(),
    );

    // Auto-shortlist assigned participants for CODING events so DB shortlists table stays in sync
    if (data.type === "CODING" && data.participantIds.length) {
      try {
        const { data: sl } = await db.from("shortlists").select("user_id").in("user_id", data.participantIds);
        const ok = new Set((sl ?? []).map((s) => s.user_id));
        const toAdd = data.participantIds.filter((id) => !ok.has(id));
        if (toAdd.length > 0) {
          await db.from("shortlists").insert(toAdd.map((user_id) => ({ user_id, from_event_id: ev.id })));
        }
      } catch (e) {
        console.warn("[createEvent] Shortlist sync note:", e);
      }
    }

    if (data.participantIds.length) {
      check(await db.from("event_participants").insert(data.participantIds.map((user_id) => ({ event_id: ev.id, user_id }))));
    }

    if (data.type === "MCQ" && data.mcq.length) {
      check(await db.from("mcq_questions").insert(data.mcq.map((q, i) => ({ ...q, event_id: ev.id, position: i + 1 }))));
    }

    if (data.type === "CODING") {
      // Ensure we have questions for all 3 difficulties: EASY, MEDIUM, HARD
      const providedDiffs = new Set(data.coding.map((q) => q.difficulty));
      const questionsToInsert: Array<{
        title: string;
        description: string;
        input_format: string;
        output_format: string;
        constraints: string;
        difficulty: "EASY" | "MEDIUM" | "HARD";
        time_limit_ms: number;
        memory_limit_mb: number;
      }> = [...data.coding];

      for (const diff of ["EASY", "MEDIUM", "HARD"] as const) {
        if (!providedDiffs.has(diff)) {
          questionsToInsert.push({ ...DEFAULT_CODING_QUESTIONS[diff] });
        }
      }

      const order = { EASY: 1, MEDIUM: 2, HARD: 3 } as const;
      const insertedQuestions = check(
        await db.from("coding_questions").insert(
          questionsToInsert.map((q) => ({
            ...q,
            event_id: ev.id,
            marks_per_case: 2,
            position: order[q.difficulty],
          }))
        ).select("id, difficulty")
      );

      // Populate test cases (EASY: 20, MEDIUM: 20, HARD: 10 = 50 cases total, 100 marks)
      for (const q of insertedQuestions ?? []) {
        await ensureCodingQuestionTestCases(db, q.id, q.difficulty as "EASY" | "MEDIUM" | "HARD", 0);
      }
    }

    return { id: ev.id, status: initialStatus };
  });

export const getEventDetail = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const evRes = await db.from("events").select("*").eq("id", data.id).maybeSingle();
    if (evRes.error) throw new Error(evRes.error.message);
    const ev = evRes.data;
    if (!ev) throw new Error("Event not found");
    const [ep, mq, cq] = await Promise.all([
      db.from("event_participants").select("user_id, status").eq("event_id", ev.id),
      db.from("mcq_questions").select("*").eq("event_id", ev.id).order("position"),
      db.from("coding_questions").select("*").eq("event_id", ev.id).order("position"),
    ]);
    const qids = (cq.data ?? []).map((q) => q.id);
    const tc = qids.length
      ? await db.from("coding_test_cases").select("*").in("question_id", qids).order("position")
      : { data: [] as never[] };
    const uids = (ep.data ?? []).map((r) => r.user_id);
    const profs = uids.length ? await db.from("profiles").select("id, participant_code, full_name").in("id", uids) : { data: [] };
    return {
      event: ev,
      participants: (ep.data ?? []).map((r) => ({ ...r, profile: (profs.data ?? []).find((p) => p.id === r.user_id) ?? null })),
      mcq: mcq_or(mq.data),
      coding: (cq.data ?? []).map((q) => ({ ...q, cases: (tc.data ?? []).filter((c) => c.question_id === q.id) })),
    };
  });
function mcq_or<T>(x: T[] | null) { return x ?? []; }

export const updateEventDetails = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) =>
    z.object({ id: z.string().uuid(), name: z.string().trim().min(2).max(150), startsAt: z.string().datetime({ offset: true }), endsAt: z.string().datetime({ offset: true }) }).parse(d),
  )
  .handler(async ({ data, context: { db } }) => {
    if (new Date(data.endsAt) <= new Date(data.startsAt)) throw new Error("End time must be after start time");
    check(await db.from("events").update({ name: data.name, starts_at: data.startsAt, ends_at: data.endsAt }).eq("id", data.id));
    return { ok: true };
  });

export const setEventStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ id: z.string().uuid(), status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]) }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const ev = check(await db.from("events").select("id, type").eq("id", data.id).single());
    if (data.status === "SCHEDULED" || data.status === "LIVE") {
      const { count: pc } = await db.from("event_participants").select("id", { count: "exact", head: true }).eq("event_id", ev.id);
      if (!pc) throw new Error("Assign at least one participant first");
      if (ev.type === "MCQ") {
        const { count } = await db.from("mcq_questions").select("id", { count: "exact", head: true }).eq("event_id", ev.id);
        if (count !== MCQ_QUESTION_COUNT) throw new Error(`An MCQ event needs exactly ${MCQ_QUESTION_COUNT} questions (has ${count ?? 0})`);
      } else {
        const { data: qs } = await db.from("coding_questions").select("id, difficulty, title").eq("event_id", ev.id);
        const diffMap = new Map((qs ?? []).map((q: any) => [q.difficulty, q]));

        // Ensure Easy, Medium, Hard exist
        for (const diff of ["EASY", "MEDIUM", "HARD"] as const) {
          if (!diffMap.has(diff)) {
            const order = { EASY: 1, MEDIUM: 2, HARD: 3 }[diff];
            const ins = check(
              await db.from("coding_questions").insert({
                ...DEFAULT_CODING_QUESTIONS[diff],
                position: order,
                event_id: ev.id,
                marks_per_case: 2,
              }).select("id, difficulty, title").single()
            );
            diffMap.set(diff, ins);
          }
        }

        // Ensure each question has the required number of test cases (20 for EASY, 20 for MEDIUM, 10 for HARD)
        for (const [diff, q] of diffMap.entries()) {
          const { count } = await db.from("coding_test_cases").select("id", { count: "exact", head: true }).eq("question_id", q.id);
          await ensureCodingQuestionTestCases(db, q.id, diff as "EASY" | "MEDIUM" | "HARD", count ?? 0);
        }
      }
    }
    check(await db.from("events").update({ status: data.status }).eq("id", data.id));
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const ev = check(await db.from("events").select("status").eq("id", data.id).single());
    if (ev.status !== "DRAFT") throw new Error("Only draft events can be deleted. Cancel it instead.");
    const { data: qs } = await db.from("coding_questions").select("id").eq("event_id", data.id);
    if (qs?.length) await db.from("coding_test_cases").delete().in("question_id", qs.map((q) => q.id));
    await db.from("coding_questions").delete().eq("event_id", data.id);
    await db.from("mcq_questions").delete().eq("event_id", data.id);
    await db.from("event_participants").delete().eq("event_id", data.id);
    check(await db.from("events").delete().eq("id", data.id));
    return { ok: true };
  });

export const setEventParticipants = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ id: z.string().uuid(), participantIds: z.array(z.string().uuid()).max(5000) }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const ev = check(await db.from("events").select("type").eq("id", data.id).single());
    // For CODING events, auto-shortlist any participants not already in the shortlists table
    if (ev.type === "CODING" && data.participantIds.length) {
      const { data: sl } = await db.from("shortlists").select("user_id").in("user_id", data.participantIds);
      const alreadyShortlisted = new Set((sl ?? []).map((s: any) => s.user_id));
      const toAdd = data.participantIds.filter((id) => !alreadyShortlisted.has(id));
      if (toAdd.length > 0) {
        await db.from("shortlists").insert(toAdd.map((user_id) => ({ user_id, from_event_id: data.id }))).select();
      }
    }
    const { data: cur } = await db.from("event_participants").select("user_id").eq("event_id", data.id);
    const curSet = new Set((cur ?? []).map((r: any) => r.user_id));
    const next = new Set(data.participantIds);
    const remove = [...curSet].filter((id) => !next.has(id));
    const add = [...next].filter((id) => !curSet.has(id));
    if (remove.length) check(await db.from("event_participants").delete().eq("event_id", data.id).in("user_id", remove));
    if (add.length) check(await db.from("event_participants").insert(add.map((user_id) => ({ event_id: data.id, user_id }))));
    return { ok: true };
  });

// ---------- MCQ questions ----------
export const saveMcqQuestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => mcqQ.extend({ eventId: z.string().uuid(), id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const { eventId, id, ...q } = data;
    if (id) {
      check(await db.from("mcq_questions").update(q).eq("id", id).eq("event_id", eventId));
    } else {
      const { count } = await db.from("mcq_questions").select("id", { count: "exact", head: true }).eq("event_id", eventId);
      if ((count ?? 0) >= MCQ_QUESTION_COUNT) throw new Error(`Maximum ${MCQ_QUESTION_COUNT} questions`);
      check(await db.from("mcq_questions").insert({ ...q, event_id: eventId, position: (count ?? 0) + 1 }));
    }
    return { ok: true };
  });

export const deleteMcqQuestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ id: z.string().uuid(), eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    check(await db.from("mcq_questions").delete().eq("id", data.id).eq("event_id", data.eventId));
    const { data: rest } = await db.from("mcq_questions").select("id").eq("event_id", data.eventId).order("position");
    await Promise.all((rest ?? []).map((r, i) => db.from("mcq_questions").update({ position: i + 1 }).eq("id", r.id)));
    return { ok: true };
  });

export const moveMcqQuestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ id: z.string().uuid(), eventId: z.string().uuid(), dir: z.enum(["up", "down"]) }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const { data: rows } = await db.from("mcq_questions").select("id, position").eq("event_id", data.eventId).order("position");
    const list = rows ?? [];
    const i = list.findIndex((r) => r.id === data.id);
    const j = data.dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= list.length) return { ok: true };
    await db.from("mcq_questions").update({ position: j + 1 }).eq("id", list[i]!.id);
    await db.from("mcq_questions").update({ position: i + 1 }).eq("id", list[j]!.id);
    return { ok: true };
  });

// ---------- Coding questions & test cases ----------
export const saveCodingQuestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => codingQ.extend({ eventId: z.string().uuid(), id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const { eventId, id, ...q } = data;
    const { data: existing } = await db.from("coding_questions").select("id").eq("event_id", eventId).eq("difficulty", q.difficulty);
    if ((existing ?? []).some((e) => e.id !== id)) throw new Error(`This event already has a ${q.difficulty} question`);
    const position = { EASY: 1, MEDIUM: 2, HARD: 3 }[q.difficulty];
    if (id) check(await db.from("coding_questions").update({ ...q, position }).eq("id", id).eq("event_id", eventId));
    else check(await db.from("coding_questions").insert({ ...q, position, event_id: eventId, marks_per_case: 2 }));
    return { ok: true };
  });

export const deleteCodingQuestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    await db.from("coding_test_cases").delete().eq("question_id", data.id);
    check(await db.from("coding_questions").delete().eq("id", data.id));
    return { ok: true };
  });

export const saveTestCase = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) =>
    z.object({
      questionId: z.string().uuid(), id: z.string().uuid().optional(),
      input: z.string().max(100000), expected_output: z.string().max(100000), is_sample: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context: { db } }) => {
    const { questionId, id, ...c } = data;
    if (id) {
      check(await db.from("coding_test_cases").update(c).eq("id", id).eq("question_id", questionId));
    } else {
      const q = check(await db.from("coding_questions").select("difficulty").eq("id", questionId).single());
      const { count } = await db.from("coding_test_cases").select("id", { count: "exact", head: true }).eq("question_id", questionId);
      const lim = CODING_CASES[q.difficulty] ?? 15;
      if ((count ?? 0) >= lim) throw new Error(`${q.difficulty} questions take ${lim} test cases`);
      check(await db.from("coding_test_cases").insert({ ...c, question_id: questionId, position: (count ?? 0) + 1 }));
    }
    return { ok: true };
  });

export const deleteTestCase = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ id: z.string().uuid(), questionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    check(await db.from("coding_test_cases").delete().eq("id", data.id).eq("question_id", data.questionId));
    const { data: rest } = await db.from("coding_test_cases").select("id").eq("question_id", data.questionId).order("position");
    await Promise.all((rest ?? []).map((r, i) => db.from("coding_test_cases").update({ position: i + 1 }).eq("id", r.id)));
    return { ok: true };
  });

// ---------- Leaderboard ----------
async function getAllProfilesMap(db: any) {
  const { getRegisteredParticipants } = await import("@/lib/participants.store");
  const { data: dbProfiles } = await db.from("profiles").select("id, participant_code, full_name");
  const profMap = new Map<string, { id: string; participant_code: string | null; full_name: string }>();
  for (const rp of getRegisteredParticipants()) {
    profMap.set(rp.id, { id: rp.id, participant_code: rp.participant_code, full_name: rp.full_name });
  }
  for (const p of dbProfiles ?? []) {
    profMap.set(p.id, p);
  }
  return profMap;
}

export const getMcqLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const [attempts, profMap] = await Promise.all([
      db.from("mcq_attempts").select("user_id, score, started_at, submitted_at, status").eq("event_id", data.eventId).eq("status", "SUBMITTED").order("score", { ascending: false }),
      getAllProfilesMap(db),
    ]);
    const rows = (attempts.data ?? []).map((a) => {
      const duration = a.started_at && a.submitted_at
        ? Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)
        : null;
      return { ...a, duration, profile: profMap.get(a.user_id) ?? null };
    });
    // Sort: higher score first, then shorter duration
    rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.duration ?? Infinity) - (b.duration ?? Infinity));
    return rows;
  });

export const getCodingLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const [attempts, profMap, questions] = await Promise.all([
      db.from("coding_attempts").select("user_id, total_score, total_passed, started_at, submitted_at, status").eq("event_id", data.eventId).eq("status", "SUBMITTED"),
      getAllProfilesMap(db),
      db.from("coding_questions").select("id, difficulty").eq("event_id", data.eventId),
    ]);
    // Per-question scores from coding_submissions
    const qids = (questions.data ?? []).map((q) => q.id);
    const subsRes = qids.length
      ? await db.from("coding_submissions").select("user_id, question_id, score, passed_count").in("question_id", qids).eq("event_id", data.eventId)
      : { data: [] as { user_id: string; question_id: string; score: number; passed_count: number }[] };
    const qMap = new Map((questions.data ?? []).map((q) => [q.id, q]));
    const rows = (attempts.data ?? []).map((a) => {
      const mySubs = (subsRes.data ?? []).filter((r) => r.user_id === a.user_id);
      const byDiff: Record<string, { score: number; cases: number }> = {};
      for (const r of mySubs) {
        const q = qMap.get(r.question_id);
        if (q) byDiff[q.difficulty] = { score: r.score, cases: r.passed_count };
      }
      const duration = a.started_at && a.submitted_at
        ? Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)
        : null;
      return { ...a, duration, profile: profMap.get(a.user_id) ?? null, byDiff };
    });
    rows.sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0) || (b.total_passed ?? 0) - (a.total_passed ?? 0) || (a.duration ?? Infinity) - (b.duration ?? Infinity));
    return rows;
  });

// ---------- Shortlisting ----------
export const getShortlistCandidates = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const [attempts, profMap, shortlists] = await Promise.all([
      db.from("mcq_attempts").select("user_id, score, started_at, submitted_at, status").eq("event_id", data.eventId).eq("status", "SUBMITTED"),
      getAllProfilesMap(db),
      db.from("shortlists").select("user_id"),
    ]);
    const shortlistedIds = new Set((shortlists.data ?? []).map((s) => s.user_id));
    const rows = (attempts.data ?? []).map((a) => {
      const duration = a.started_at && a.submitted_at
        ? Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)
        : null;
      return { ...a, duration, profile: profMap.get(a.user_id) ?? null, shortlisted: shortlistedIds.has(a.user_id) };
    });
    rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.duration ?? Infinity) - (b.duration ?? Infinity));
    return rows;
  });

export const setShortlist = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ userIds: z.array(z.string().uuid()).max(5000), eventId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    // Replace entire shortlist: remove all, then insert selected
    await db.from("shortlists").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    if (data.userIds.length) {
      let eventId = data.eventId;
      if (!eventId) {
        const { data: ev } = await db.from("events").select("id").eq("type", "MCQ").limit(1).maybeSingle();
        eventId = ev?.id;
      }
      if (!eventId) {
        const { data: ev } = await db.from("events").select("id").limit(1).maybeSingle();
        eventId = ev?.id;
      }
      if (eventId) {
        check(await db.from("shortlists").insert(data.userIds.map((user_id) => ({ user_id, from_event_id: eventId! }))));
      }
    }
    return { ok: true };
  });

// ---------- Results ----------
export const getMcqResults = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context: { db } }) => {
    const [attempts, profMap, events] = await Promise.all([
      db.from("mcq_attempts").select("*"),
      getAllProfilesMap(db),
      db.from("events").select("id, name").eq("type", "MCQ"),
    ]);
    const evMap = new Map((events.data ?? []).map((e) => [e.id, e]));
    return (attempts.data ?? []).map((a) => ({
      ...a,
      profile: profMap.get(a.user_id) ?? null,
      event: evMap.get(a.event_id) ?? null,
      duration: a.started_at && a.submitted_at
        ? Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)
        : null,
    }));
  });

export const getCodingResults = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context: { db } }) => {
    const [attempts, profMap, events, questions] = await Promise.all([
      db.from("coding_attempts").select("*"),
      getAllProfilesMap(db),
      db.from("events").select("id, name").eq("type", "CODING"),
      db.from("coding_questions").select("id, event_id, difficulty"),
    ]);
    const evMap = new Map((events.data ?? []).map((e) => [e.id, e]));
    const qids = (questions.data ?? []).map((q) => q.id);
    const subsRes = qids.length
      ? await db.from("coding_submissions").select("user_id, question_id, score, passed_count, event_id").in("question_id", qids)
      : { data: [] as { user_id: string; question_id: string; score: number; passed_count: number; event_id: string }[] };
    return (attempts.data ?? []).map((a) => {
      const mySubs = (subsRes.data ?? []).filter((r) => r.user_id === a.user_id && r.event_id === a.event_id);
      const ev = evMap.get(a.event_id);
      const evQs = (questions.data ?? []).filter((q) => q.event_id === a.event_id);
      const byDiff: Record<string, { score: number; cases: number }> = {};
      for (const r of mySubs) {
        const q = evQs.find((x) => x.id === r.question_id);
        if (q) byDiff[q.difficulty] = { score: r.score, cases: r.passed_count };
      }
      return {
        ...a,
        profile: profMap.get(a.user_id) ?? null,
        event: ev ?? null,
        byDiff,
        duration: a.started_at && a.submitted_at
          ? Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)
          : null,
      };
    });
  });


// ---------- Publish / Unpublish Results ----------
export const publishResults = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    check(await db.from("events").update({ results_published: true }).eq("id", data.eventId));
    return { ok: true };
  });

export const unpublishResults = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    check(await db.from("events").update({ results_published: false }).eq("id", data.eventId));
    return { ok: true };
  });

export const getResultPublishStatus = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context: { db } }) => {
    const ev = check(await db.from("events").select("id, results_published").eq("id", data.eventId).single());
    return { published: (ev as any).results_published ?? false };
  });
