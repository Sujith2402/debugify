import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminExists, bootstrapAdmin } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Coordinator Access — Debugify" },
      { name: "description", content: "Secure coordinator access for Debugify event management." },
      { property: "og:title", content: "Coordinator Access — Debugify" },
      { property: "og:description", content: "Secure coordinator access for Debugify event management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(adminExists);
  const bootstrap = useServerFn(bootstrapAdmin);
  const { data, refetch } = useQuery({ queryKey: ["admin-exists"], queryFn: () => checkAdmin() });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const setup = data && !data.exists;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (setup) {
        await bootstrap({ data: { fullName, email, password } });
        await refetch();
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error("Wrong email or password.");
      const { data: verified, error: verificationError } = await supabase.auth.getUser();
      if (verificationError || !verified.user) throw new Error("Sign-in could not be verified. Please try again.");
      toast.success("Welcome, coordinator!");
      await navigate({ to: "/admin", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="neon-stage flex min-h-screen items-center justify-center px-5 py-10">
      <section className="glass-panel relative w-full max-w-md rounded-xl p-7 sm:p-9">
        <LockKeyhole className="h-8 w-8 text-neon-pink" />
        <p className="mt-5 font-mono-code text-xs uppercase text-neon-cyan">Restricted endpoint</p>
        <h1 className="mt-2 text-3xl font-bold">Coordinator access</h1>
        <p className="mt-2 text-sm text-muted-foreground">Authorized event staff only.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          {setup && (
            <div className="space-y-2">
              <Label htmlFor="admin-name">Full name</Label>
              <Input id="admin-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input id="admin-password" type="password" minLength={setup ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          <Button type="submit" size="lg" className="mt-2 h-12 w-full rounded-lg font-display font-bold" disabled={busy || !data}>
            {busy ? "Please wait…" : setup ? "Create coordinator & enter" : "Enter control room"}
          </Button>
        </form>
        <Button asChild variant="ghost" className="mt-5 w-full text-muted-foreground">
          <Link to="/"><ArrowLeft /> Back to event</Link>
        </Button>
      </section>
    </main>
  );
}