import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({
  name,
  badge,
  nav,
  children,
}: {
  name: string;
  badge: string;
  nav?: { to: string; label: string }[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  function toggleTheme() {
    const light = document.documentElement.classList.toggle("light");
    localStorage.setItem("debugify-theme", light ? "light" : "dark");
  }
  return (
    <div className="min-h-screen">
      <header className="border-b bg-sidebar">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <span className="font-display text-lg font-bold">
            debug<span className="text-primary">ify</span>
          </span>
          <nav className="flex gap-1">
            {nav?.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-primary/15 !text-foreground" }}
                activeOptions={{ exact: true }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm sm:inline">{name}</span>
            <span className="rounded border border-primary/40 px-2 py-0.5 font-mono-code text-xs text-primary">{badge}</span>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              <Sun className="h-4 w-4" />
              <Moon className="sr-only h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
