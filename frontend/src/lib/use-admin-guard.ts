import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/integrations/api/client";
import { toast } from "sonner";

/** Verifies the current user has the `admin` role; otherwise redirects to /auth. */
export function useAdminGuard() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await api.auth.getUser();
      if (!u.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data, error } = await api
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error || !data) {
        toast.error("You need admin access to view this page.");
        await api.auth.signOut();
        navigate({ to: "/auth" });
        return;
      }
      setReady(true);
    })();
  }, [navigate]);

  return ready;
}
