import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Play, Send, Clock, CheckCircle2, XCircle,
  Terminal, Code2, Trophy, AlertTriangle, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getCodingAssessment, runCode, submitCodingTest } from "@/lib/participant.functions";

const LANGUAGES = [
  { id: "python", label: "Python 3", template: `# Write your solution here\nimport sys\ninput_data = sys.stdin.read()\n\n# Your code here\n` },
  { id: "cpp", label: "C++17", template: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Your code here\n    \n    return 0;\n}\n` },
  { id: "c", label: "C (GCC)", template: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    // Your code here\n    \n    return 0;\n}\n` },
  { id: "java", label: "Java 17", template: `import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // Your code here\n        \n    }\n}\n` },
] as const;

type LangId = (typeof LANGUAGES)[number]["id"];

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  executionTimeMs?: number;
}

interface RunOutput {
  status: "AC" | "WA" | "TLE" | "RE" | "CE" | "pending";
  output?: string;
  error?: string;
  results?: TestResult[];
  passedCount?: number;
  totalCount?: number;
}

const DIFF_CONFIG = {
  EASY:   { label: "Easy",   color: "text-neon-lime",    bg: "bg-neon-lime/10 border-neon-lime/30",    cases: 20, marks: 2, total: 40 },
  MEDIUM: { label: "Medium", color: "text-warning",      bg: "bg-warning/10 border-warning/30",        cases: 20, marks: 2, total: 40 },
  HARD:   { label: "Hard",   color: "text-destructive",  bg: "bg-destructive/10 border-destructive/30", cases: 10, marks: 2, total: 20 },
} as const;

export function CodingTestRunner({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const fetchDetails = useServerFn(getCodingAssessment);
  const doRunCode    = useServerFn(runCode);
  const doSubmit     = useServerFn(submitCodingTest);
  const qc           = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["coding-assessment", eventId],
    queryFn: () => fetchDetails({ data: { eventId } }),
  });

  const questions    = data?.codingQuestions ?? [];
  const sampleCases  = data?.sampleCases ?? [];

  const [codes, setCodes]             = useState<Record<string, string>>({});
  const [langs, setLangs]             = useState<Record<string, LangId>>({});
  const [activeQ, setActiveQ]         = useState<string | null>(null);
  const [runOutputs, setRunOutputs]   = useState<Record<string, RunOutput>>({});
  const [activeTab, setActiveTab]     = useState<"problem" | "editor" | "output">("problem");
  const [secondsElapsed, setSeconds]  = useState(0);
  const [submitted, setSubmitted]     = useState<null | { totalScore: number; totalPassed: number; byDiff: Record<string, { score: number; passed: number }> }>(null);
  const [customInput, setCustomInput] = useState("");
  const [outputTab, setOutputTab]     = useState<"sample" | "custom">("sample");
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  useEffect(() => {
    if (questions.length && !activeQ && questions[0]) setActiveQ(questions[0].id);
  }, [questions, activeQ]);

  const getLang = useCallback((qId: string): LangId => langs[qId] ?? "python", [langs]);

  const getCode = useCallback((qId: string): string => {
    if (codes[qId] !== undefined) return codes[qId];
    const lang = getLang(qId);
    return LANGUAGES.find((l) => l.id === lang)?.template ?? "";
  }, [codes, getLang]);

  const setLangFor = (qId: string, lang: LangId) => {
    const prevTemplate = LANGUAGES.find((l) => l.id === getLang(qId))?.template ?? "";
    setLangs((p) => ({ ...p, [qId]: lang }));
    if (!codes[qId] || codes[qId] === prevTemplate) {
      setCodes((p) => ({ ...p, [qId]: LANGUAGES.find((l) => l.id === lang)?.template ?? "" }));
    }
  };

  const setCode = (qId: string, code: string) => setCodes((p) => ({ ...p, [qId]: code }));

  const runMutation = useMutation({
    mutationFn: async (qId: string) => {
      const q = questions.find((x) => x.id === qId);
      if (!q) throw new Error("Question not found");
      const cases = outputTab === "custom"
        ? [{ input: customInput, expected_output: "", is_sample: true }]
        : sampleCases.filter((c: any) => c.question_id === qId && c.is_sample);
      return doRunCode({
        data: {
          code: getCode(qId),
          language: getLang(qId),
          testCases: cases.map((c: any) => ({ input: c.input, expectedOutput: c.expected_output })),
        },
      });
    },
    onSuccess: (result: any, qId) => {
      setRunOutputs((p) => ({ ...p, [qId]: result }));
      setActiveTab("output");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      doSubmit({
        data: {
          eventId,
          submissions: questions.map((q: any) => ({ questionId: q.id, code: getCode(q.id), language: getLang(q.id) })),
          durationSeconds: secondsElapsed,
        },
      }),
    onSuccess: (res: any) => {
      setSubmitted(res);
      toast.success("Coding round submitted!");
      qc.invalidateQueries({ queryKey: ["my-assigned-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, qId: string) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart: start, selectionEnd: end } = ta;
      const newCode = getCode(qId).substring(0, start) + "    " + getCode(qId).substring(end);
      setCode(qId, newCode);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 4; });
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono-code text-sm text-neon-cyan animate-pulse">Loading coding round…</p>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="glass-panel w-full max-w-md rounded-2xl p-8 text-center space-y-4">
          <Code2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h2 className="text-lg font-bold">No questions configured</h2>
          <p className="text-xs text-muted-foreground">The coordinator hasn't added questions yet.</p>
          <Button onClick={onClose} variant="outline" className="w-full">Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-5 bg-background">
        <div className="glass-panel w-full max-w-2xl rounded-2xl p-8 space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-display text-3xl font-bold">Round 2 Complete!</h2>
            <p className="mt-2 text-muted-foreground">Your solutions have been submitted and evaluated.</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {(["EASY", "MEDIUM", "HARD"] as const).map((diff) => {
              const cfg = DIFF_CONFIG[diff];
              const d = submitted.byDiff[diff] ?? { score: 0, passed: 0 };
              return (
                <div key={diff} className={cn("rounded-xl border p-4 text-center", cfg.bg)}>
                  <p className={cn("text-xs font-bold uppercase tracking-widest", cfg.color)}>{cfg.label}</p>
                  <p className="font-display text-3xl font-bold mt-2">{d.score}</p>
                  <p className="text-xs text-muted-foreground mt-1">/ {cfg.total} pts</p>
                  <p className="text-xs text-muted-foreground">{d.passed}/{cfg.cases} cases</p>
                </div>
              );
            })}
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-5 text-center">
            <p className="text-sm text-muted-foreground">Total Score</p>
            <p className="font-display text-5xl font-bold text-primary mt-1">{submitted.totalScore}</p>
            <p className="text-sm text-muted-foreground mt-1">/ 100 pts · {submitted.totalPassed} test cases passed</p>
          </div>
          <Button onClick={onClose} className="w-full">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const activeQuestion  = questions.find((q: any) => q.id === activeQ);
  const currentLang     = activeQ ? getLang(activeQ) : "python";
  const currentCode     = activeQ ? getCode(activeQ) : "";
  const currentOutput   = activeQ ? runOutputs[activeQ] : undefined;
  const currentSamples  = activeQ ? sampleCases.filter((c: any) => c.question_id === activeQ && c.is_sample) : [];

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar/95 px-4 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-lg hidden sm:block">
            debug<span className="text-primary">ify</span>
          </span>
          <span className="rounded bg-primary/20 px-2 py-0.5 font-mono-code text-[11px] text-primary">CODING ROUND</span>
          <span className="hidden text-xs text-muted-foreground sm:block">{data.event?.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1.5 font-mono-code text-sm font-bold text-neon-cyan">
            <Clock className="h-4 w-4" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>
          <Button size="sm" variant="destructive" disabled={submitMutation.isPending}
            onClick={() => { if (confirm("Submit all solutions? This cannot be undone.")) submitMutation.mutate(); }}
            className="font-bold"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {submitMutation.isPending ? "Submitting…" : "Final Submit"}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex w-64 shrink-0 flex-col border-r border-border bg-sidebar/50 overflow-hidden">
          <div className="border-b border-border p-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">Problems</p>
            {questions.map((q: any) => {
              const cfg = DIFF_CONFIG[q.difficulty as keyof typeof DIFF_CONFIG];
              const hasCode = codes[q.id] && codes[q.id] !== LANGUAGES.find((l) => l.id === (langs[q.id] ?? "python"))?.template;
              return (
                <button key={q.id} onClick={() => { setActiveQ(q.id); setActiveTab("problem"); }}
                  className={cn("w-full rounded-lg px-3 py-2.5 text-left transition-all", activeQ === q.id ? "bg-primary/15 text-foreground" : "hover:bg-accent/50 text-muted-foreground")}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-bold uppercase", cfg?.color)}>{q.difficulty}</span>
                    {hasCode && <span className="h-2 w-2 rounded-full bg-neon-lime" />}
                  </div>
                  <p className="mt-0.5 text-sm font-medium line-clamp-1">{q.title}</p>
                  <p className="text-xs opacity-60">{cfg?.cases} cases · {cfg?.total} pts</p>
                </button>
              );
            })}
          </div>

          <div className="border-t border-border mt-auto p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mark Scheme</p>
            {(["EASY", "MEDIUM", "HARD"] as const).map((diff) => {
              const cfg = DIFF_CONFIG[diff];
              return (
                <div key={diff} className="flex items-center justify-between text-xs">
                  <span className={cfg.color}>{cfg.label}</span>
                  <span className="font-mono-code text-muted-foreground">{cfg.cases}×{cfg.marks} = {cfg.total}</span>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-bold">
              <span>Total</span>
              <span className="font-mono-code text-primary">100 pts</span>
            </div>
          </div>
        </div>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeQuestion && (
            <>
              {/* Tab bar */}
              <div className="flex h-10 shrink-0 items-center border-b border-border bg-background px-4 gap-1">
                {(["problem", "editor", "output"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={cn("rounded px-3 py-1 text-sm font-medium transition-colors capitalize",
                      activeTab === tab ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {tab === "output" && currentOutput && (
                      <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full",
                        currentOutput.status === "AC" ? "bg-neon-lime" : currentOutput.status === "WA" ? "bg-destructive" : "bg-warning"
                      )} />
                    )}
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Problem Tab */}
                {activeTab === "problem" && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-3xl">
                    {(() => {
                      const cfg = DIFF_CONFIG[activeQuestion.difficulty as keyof typeof DIFF_CONFIG];
                      return (
                        <>
                          <div className="flex items-center gap-3">
                            <span className={cn("rounded-full border px-3 py-0.5 text-xs font-bold uppercase", cfg?.bg, cfg?.color)}>
                              {activeQuestion.difficulty}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono-code">{cfg?.cases} test cases · {cfg?.total} marks</span>
                          </div>
                          <h2 className="font-display text-2xl font-bold">{activeQuestion.title}</h2>

                          {activeQuestion.description && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Problem Statement</p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeQuestion.description}</p>
                            </div>
                          )}
                          {activeQuestion.input_format && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Input Format</p>
                              <pre className="text-sm font-mono-code bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{activeQuestion.input_format}</pre>
                            </div>
                          )}
                          {activeQuestion.output_format && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Output Format</p>
                              <pre className="text-sm font-mono-code bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{activeQuestion.output_format}</pre>
                            </div>
                          )}
                          {activeQuestion.constraints && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Constraints</p>
                              <pre className="text-sm font-mono-code bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{activeQuestion.constraints}</pre>
                            </div>
                          )}

                          {currentSamples.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sample Cases</p>
                              <div className="space-y-3">
                                {currentSamples.slice(0, 3).map((tc: any, idx: number) => (
                                  <div key={tc.id} className="rounded-xl border border-border overflow-hidden">
                                    <p className="border-b border-border px-3 py-1.5 text-xs font-mono-code text-muted-foreground bg-muted/20">Example {idx + 1}</p>
                                    <div className="grid grid-cols-2 divide-x divide-border">
                                      <div className="p-3">
                                        <p className="text-[11px] font-semibold text-muted-foreground mb-1">INPUT</p>
                                        <pre className="text-xs font-mono-code whitespace-pre-wrap">{tc.input || "(empty)"}</pre>
                                      </div>
                                      <div className="p-3">
                                        <p className="text-[11px] font-semibold text-muted-foreground mb-1">OUTPUT</p>
                                        <pre className="text-xs font-mono-code whitespace-pre-wrap">{tc.expected_output}</pre>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button size="sm" onClick={() => setActiveTab("editor")}>
                            <Code2 className="mr-1.5 h-3.5 w-3.5" /> Write Solution
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Editor Tab */}
                {activeTab === "editor" && (
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-sidebar/30 px-4">
                      <select value={currentLang}
                        onChange={(e) => activeQ && setLangFor(activeQ, e.target.value as LangId)}
                        className="h-7 rounded border border-border bg-background px-2 text-xs font-mono-code text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                      </select>
                      <button onClick={() => activeQ && setCode(activeQ, LANGUAGES.find((l) => l.id === currentLang)?.template ?? "")}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </button>
                      <div className="ml-auto flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => activeQ && runMutation.mutate(activeQ)}
                          disabled={runMutation.isPending} className="h-7 gap-1 text-xs"
                        >
                          <Play className="h-3 w-3" />
                          {runMutation.isPending ? "Running…" : "Run Code"}
                        </Button>
                      </div>
                    </div>

                    {/* Code editor with line numbers */}
                    <div className="relative flex flex-1 overflow-hidden font-mono-code">
                      {/* Line numbers */}
                      <div className="pointer-events-none select-none w-12 shrink-0 overflow-hidden border-r border-border bg-sidebar/30 pt-3 pb-3 text-right">
                        {currentCode.split("\n").map((_, i) => (
                          <div key={i} className="leading-[1.6] text-xs text-muted-foreground/40 pr-2">{i + 1}</div>
                        ))}
                      </div>
                      <textarea ref={textareaRef} value={currentCode}
                        onChange={(e) => activeQ && setCode(activeQ, e.target.value)}
                        onKeyDown={(e) => activeQ && handleKeyDown(e, activeQ)}
                        className="flex-1 resize-none bg-transparent text-sm leading-[1.6] text-foreground focus:outline-none p-3 overflow-auto"
                        style={{ tabSize: 4 }}
                        spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
                      />
                    </div>
                  </div>
                )}

                {/* Output Tab */}
                {activeTab === "output" && (
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-4">
                      {(["sample", "custom"] as const).map((t) => (
                        <button key={t} onClick={() => setOutputTab(t)}
                          className={cn("rounded px-3 py-1 text-xs font-medium transition-colors capitalize",
                            outputTab === t ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {t === "sample" ? `Sample Cases (${currentSamples.length})` : "Custom Input"}
                        </button>
                      ))}
                      <div className="ml-auto">
                        <Button size="sm" variant="outline" onClick={() => activeQ && runMutation.mutate(activeQ)}
                          disabled={runMutation.isPending} className="h-7 gap-1 text-xs"
                        >
                          <Play className="h-3 w-3" />
                          {runMutation.isPending ? "Running…" : "Run"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {outputTab === "custom" && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Custom Input</p>
                          <textarea value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                            placeholder="Enter your custom input here…" rows={6}
                            className="w-full rounded-lg border border-border bg-muted/20 p-3 font-mono-code text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      )}

                      {runMutation.isPending && (
                        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <p className="text-sm font-mono-code text-muted-foreground">Executing code…</p>
                        </div>
                      )}

                      {currentOutput && !runMutation.isPending && (
                        <>
                          <div className={cn("flex items-center gap-3 rounded-xl border p-4",
                            currentOutput.status === "AC" ? "border-neon-lime/40 bg-neon-lime/10" :
                            currentOutput.status === "CE" ? "border-warning/40 bg-warning/10" : "border-destructive/40 bg-destructive/10"
                          )}>
                            {currentOutput.status === "AC" ? <CheckCircle2 className="h-5 w-5 text-neon-lime" /> :
                             currentOutput.status === "CE" ? <AlertTriangle className="h-5 w-5 text-warning" /> : <XCircle className="h-5 w-5 text-destructive" />}
                            <div>
                              <p className="text-sm font-bold">
                                {currentOutput.status === "AC" ? "All Passed" : currentOutput.status === "WA" ? "Wrong Answer" :
                                 currentOutput.status === "TLE" ? "Time Limit Exceeded" : currentOutput.status === "RE" ? "Runtime Error" :
                                 currentOutput.status === "CE" ? "Compilation Error" : "Error"}
                              </p>
                              {currentOutput.passedCount !== undefined && (
                                <p className="text-xs text-muted-foreground">{currentOutput.passedCount}/{currentOutput.totalCount} sample cases passed</p>
                              )}
                            </div>
                          </div>

                          {currentOutput.error && (
                            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                              <p className="text-xs font-semibold text-warning uppercase mb-2">Error</p>
                              <pre className="text-xs font-mono-code text-warning/80 whitespace-pre-wrap overflow-x-auto">{currentOutput.error}</pre>
                            </div>
                          )}

                          {currentOutput.results && currentOutput.results.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Test Results</p>
                              {currentOutput.results.map((r, idx) => (
                                <div key={idx} className={cn("rounded-lg border p-3",
                                  r.passed ? "border-neon-lime/30 bg-neon-lime/5" : "border-destructive/30 bg-destructive/5"
                                )}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-mono-code text-muted-foreground">Case #{idx + 1}</span>
                                    <span className={cn("text-xs font-bold", r.passed ? "text-neon-lime" : "text-destructive")}>
                                      {r.passed ? "✓ Passed" : "✗ Failed"}{r.executionTimeMs !== undefined && ` · ${r.executionTimeMs}ms`}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    {[["Input", r.input || "(empty)"], ["Expected", r.expected], ["Got", r.actual || "(no output)"]].map(([label, val]) => (
                                      <div key={label}>
                                        <p className="text-muted-foreground mb-1">{label}</p>
                                        <pre className="font-mono-code bg-muted/30 rounded p-1.5 overflow-x-auto">{val}</pre>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {currentOutput.output && (
                            <div className="rounded-xl border border-border bg-muted/20 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">stdout</p>
                              <pre className="text-xs font-mono-code whitespace-pre-wrap overflow-x-auto">{currentOutput.output}</pre>
                            </div>
                          )}
                        </>
                      )}

                      {!currentOutput && !runMutation.isPending && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Terminal className="h-10 w-10 text-muted-foreground/20" />
                          <p className="mt-3 text-sm text-muted-foreground">Run your code to see output here</p>
                          <Button size="sm" variant="outline" className="mt-4" onClick={() => setActiveTab("editor")}>Go to Editor</Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
