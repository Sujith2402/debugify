import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyIdentity } from "@/lib/auth.functions";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Coordinator — Debugify" },
    { name: "description", content: "Debugify coordinator portal." },
    { property: "og:title", content: "Coordinator — Debugify" },
    { property: "og:description", content: "Debugify coordinator portal." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  beforeLoad: async () => {
    const me = await getMyIdentity();
    if (me.role !== "admin") throw redirect({ to: "/admin-login" });
    return { me };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { me } = Route.useRouteContext();
  return (
    <AdminShell name={me.fullName}>
      <Outlet />
    </AdminShell>
  );
}
