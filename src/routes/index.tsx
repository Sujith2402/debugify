import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Braces, Code2, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Debugify — Online MCQ & Coding Event Platform" },
      { name: "description", content: "Host timed MCQ and coding rounds with server-side scoring, leaderboards and shortlisting." },
      { property: "og:title", content: "Debugify — Online MCQ & Coding Event Platform" },
      { property: "og:description", content: "Host timed MCQ and coding rounds with server-side scoring, leaderboards and shortlisting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Braces, title: "MCQ sprint", text: "Twenty questions. Forty marks. One shot to qualify." },
  { icon: Code2, title: "Code arena", text: "Three difficulty levels judged against real test cases." },
  { icon: Trophy, title: "Live rankings", text: "Fair scores and completion-time tie breakers." },
];

function Landing() {
  return (
    <div className="neon-stage min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl font-bold uppercase">
          Debug<span className="text-neon-cyan">ify</span>
        </span>
        <Button asChild variant="outline" size="sm" className="border-neon-cyan/50 bg-background/30 backdrop-blur-xl hover:bg-neon-cyan hover:text-primary-foreground">
          <Link to="/auth">Participant access</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-14 md:pt-20">
        <div className="max-w-4xl md:-rotate-1">
          <p className="inline-flex items-center gap-2 font-mono-code text-sm uppercase text-neon-lime"><Sparkles className="h-4 w-4" /> College coding event</p>
          <h1 className="neon-title mt-5 font-display text-6xl font-bold leading-[0.95] sm:text-7xl lg:text-8xl">
            Think fast.<br /><span className="text-neon-cyan">Debug faster.</span>
          </h1>
        </div>
        <p className="mt-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
          Two rounds. One leaderboard. Bring your logic, your code, and your best game.
        </p>
        <div className="mt-9">
          <Button asChild size="lg" className="h-12 rounded-lg px-7 font-display font-bold shadow-[0_0_28px_color-mix(in_oklab,var(--neon-cyan)_38%,transparent)] hover:bg-neon-pink">
            <Link to="/auth">Enter the arena <ArrowRight /></Link>
          </Button>
        </div>
        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="glass-panel rounded-lg p-6 transition-transform hover:-translate-y-1">
              <f.icon className="h-6 w-6 text-neon-pink" />
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
