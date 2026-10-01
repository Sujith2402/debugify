import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Radio, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { participantEmail } from "@/lib/debugify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Debugify" },
      { name: "description", content: "Participant access for the Debugify college coding event." },
      { property: "og:title", content: "Sign in — Debugify" },
      { property: "og:description", content: "Participant access for the Debugify college coding event." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const goHome = () => navigate({ to: "/home", replace: true });

  return (
    <div className="neon-stage relative flex min-h-screen items-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute left-[8%] top-[12%] h-28 w-28 border-l border-t border-neon-cyan/40" />
      <div className="pointer-events-none absolute bottom-[10%] right-[7%] h-36 w-36 border-b border-r border-neon-pink/40" />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-[1.15fr_0.85fr]">
        <div className="text-center md:-rotate-2 md:text-left">
          <Link to="/" className="inline-flex items-center gap-2 font-mono-code text-xs uppercase text-neon-lime">
            <Radio className="h-3.5 w-3.5" /> College coding event
          </Link>
          <h1 className="neon-title mt-5 font-display text-6xl font-bold leading-none sm:text-7xl lg:text-8xl">
            DEBUG<span className="text-neon-cyan">IFY</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground md:text-xl">
            Solve fast. Code smart. Earn your place on the leaderboard.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 border-l-2 border-neon-pink pl-4 text-left">
            <span className="font-mono-code text-xs text-neon-pink">ROUND ACCESS</span>
            <span className="text-sm text-muted-foreground">Use the credentials from your coordinator.</span>
          </div>
        </div>

        <div className="neon-float glass-panel relative w-full max-w-md justify-self-center rounded-2xl p-7 sm:p-9 md:justify-self-end">
          <div className="absolute -right-1.5 -top-1.5 h-14 w-14 rounded-tr-2xl border-r-2 border-t-2 border-neon-pink" />
          <div className="mb-8">
            <p className="font-mono-code text-xs uppercase text-neon-cyan">Secure checkpoint</p>
            <h2 className="mt-2 text-3xl font-bold">Participant access</h2>
            <div className="mt-4 h-1 w-14 bg-neon-lime shadow-[0_0_18px_var(--neon-lime)]" />
          </div>
          <ParticipantLogin onDone={goHome} />
          <div className="mt-7 flex items-center gap-2 border-t border-border/60 pt-5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-neon-lime" /> Credentials are issued by your event coordinator.
          </div>
        </div>
      </div>
      <span className="pointer-events-none absolute bottom-4 left-6 hidden font-display text-8xl font-bold text-neon-cyan/10 lg:block">01</span>
    </div>
  );
}

function ParticipantLogin({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !password) return;
    setBusy(true);

    const email = participantEmail(code);
    let { error } = await supabase.auth.signInWithPassword({ email, password });

    // Support both player1/player01 or player2/player02 format automatically
    if (error) {
      let altPassword = password;
      const m1 = password.match(/^player(\d)$/i);
      const m2 = password.match(/^player0(\d)$/i);
      if (m1) {
        altPassword = `player0${m1[1]}`;
      } else if (m2) {
        altPassword = `player${m2[1]}`;
      }

      if (altPassword !== password) {
        const retry = await supabase.auth.signInWithPassword({ email, password: altPassword });
        error = retry.error;
      }
    }

    setBusy(false);
    if (error) {
      toast.error("Wrong participant ID or password.");
      return;
    }
    onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pid" className="text-xs uppercase text-muted-foreground">Participant ID</Label>
        <Input id="pid" placeholder="PX-000000" value={code} onChange={(e) => setCode(e.target.value)} className="h-12 rounded-lg border-border/70 bg-background/30 px-4 font-mono-code focus-visible:ring-neon-cyan" autoComplete="username" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ppw">Password</Label>
        <Input id="ppw" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-lg border-border/70 bg-background/30 px-4 focus-visible:ring-neon-pink" autoComplete="current-password" />
      </div>
      <Button type="submit" size="lg" className="h-12 w-full rounded-lg font-display font-bold shadow-[0_0_24px_color-mix(in_oklab,var(--neon-cyan)_35%,transparent)] hover:bg-neon-pink" disabled={busy}>
        {busy ? "Entering…" : <>Enter the arena <ArrowRight /></>}
      </Button>
    </form>
  );
}
