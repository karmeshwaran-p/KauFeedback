import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import { AdminShell } from "@/components/AdminShell";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/entries")({
  component: EntriesPage,
});

const PAGE_SIZE = 20;

interface Row {
  id: string;
  patient_name: string | null;
  age: number | null;
  visit_type: string;
  rating_overall: number;
  rating_cleanliness: number;
  rating_staff: number;
  rating_wait_time: number;
  comments: string | null;
  submitted_at: string;
  departments: { name: string } | null;
  services: { name: string } | null;
  locations: { name: string } | null;
}

function EntriesPage() {
  const ready = useAdminGuard();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count, error } = await api
      .from("feedback_entries")
      .select(
        "id,patient_name,age,visit_type,rating_overall,rating_cleanliness,rating_staff,rating_wait_time,comments,submitted_at,departments(name),services(name),locations(name)",
        { count: "exact" },
      )
      .order("submitted_at", { ascending: false })
      .range(from, to);
    if (!error) {
      setRows((data ?? []) as unknown as Row[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!ready) return null;

  return (
    <AdminShell title="All entries">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3 text-xs text-muted-foreground">
          <span>{total} total responses</span>
          <span>Page {page} of {totalPages}</span>
        </div>
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No feedback entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Patient</th>
                  <th className="px-4 py-2 font-medium">Visit</th>
                  <th className="px-4 py-2 font-medium">Department / Service</th>
                  <th className="px-4 py-2 font-medium">Location</th>
                  <th className="px-4 py-2 font-medium">Ratings (C / S / W / O)</th>
                  <th className="px-4 py-2 font-medium">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{new Date(r.submitted_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-foreground">{r.patient_name || "Anonymous"}</div>
                      {r.age && <div className="text-muted-foreground">Age {r.age}</div>}
                    </td>
                    <td className="px-4 py-2">{r.visit_type}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.departments?.name ?? "—"}</div>
                      {r.services?.name && <div className="text-muted-foreground">{r.services.name}</div>}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.locations?.name ?? "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="font-mono">
                        {r.rating_cleanliness} / {r.rating_staff} / {r.rating_wait_time} /{" "}
                        <span className="font-semibold text-amber-600">{r.rating_overall}</span>
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-2 text-muted-foreground whitespace-normal break-words">{r.comments || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
