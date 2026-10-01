import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMyIdentity } from "@/lib/auth.functions";

// Sends each signed-in user to their own area based on the role stored on the server.
export const Route = createFileRoute("/_authenticated/home")({
  ssr: false,
  beforeLoad: async () => {
    const me = await getMyIdentity();
    throw redirect({ to: me.role === "admin" ? "/admin" : "/dashboard", replace: true });
  },
});
