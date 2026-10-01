import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMyIdentity } from "@/lib/auth.functions";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({ meta: [
    { title: "My assessments — Debugify" },
    { name: "description", content: "Your assigned Debugify assessments." },
    { property: "og:title", content: "My assessments — Debugify" },
    { property: "og:description", content: "Your assigned Debugify assessments." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  beforeLoad: async () => {
    const me = await getMyIdentity();
    if (me.role === "admin") throw redirect({ to: "/admin" });
    return { me };
  },
  component: ParticipantHome,
});

function ParticipantHome() {
  const { me } = Route.useRouteContext();
  return (
    <AppShell name={me.fullName} badge={me.participantCode ?? "PARTICIPANT"}>
      <h1 className="text-3xl font-bold">Hi {me.fullName || "there"}</h1>
      <p className="mt-2 text-muted-foreground">You have no assessments assigned yet.</p>
    </AppShell>
  );
}
