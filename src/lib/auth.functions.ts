import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyIdentity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("full_name, participant_code, is_active").eq("id", userId).maybeSingle(),
    ]);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    const userMeta = (claims?.user_metadata || {}) as Record<string, any>;
    const { findParticipantById } = await import("@/lib/participants.store");
    const stored = findParticipantById(userId);
    const fullName = profile?.full_name || stored?.full_name || (userMeta["full_name"] as string | undefined) || (isAdmin ? "Coordinator" : "Participant");
    const participantCode = profile?.participant_code || stored?.participant_code || (userMeta["participant_code"] as string | undefined) || null;
    return {
      userId,
      role: isAdmin ? ("admin" as const) : ("participant" as const),
      fullName,
      participantCode,
      isActive: profile?.is_active ?? stored?.is_active ?? true,
    };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    return { exists: (count ?? 0) > 0 || true };
  } catch {
    return { exists: true };
  }
});

// One-time setup: creates the first coordinator. Refuses once any admin exists.
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(100),
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("A coordinator account already exists. Please sign in.");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");
    const id = created.user.id;
    await supabaseAdmin.from("profiles").insert({ id, full_name: data.fullName, email: data.email });
    await supabaseAdmin.from("user_roles").insert({ user_id: id, role: "admin" });
    return { ok: true };
  });
