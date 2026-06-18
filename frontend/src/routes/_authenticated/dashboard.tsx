import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import { AdminShell } from "@/components/AdminShell";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { Loader2, RefreshCw, Star, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

interface Entry {
  id: string;
  patient_name: string | null;
  visit_type: string;
  department_id: string;
  rating_overall: number;
  rating_cleanliness: number;
  rating_staff: number;
  rating_wait_time: number;
  comments: string | null;
  submitted_at: string;
}

interface DeptStat { name: string; avg: number; count: number; }

function DashboardPage() {
  const ready = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(0);
  const [overall, setOverall] = useState(0);
  const [deptStats, setDeptStats] = useState<DeptStat[]>([]);
  const [latest, setLatest] = useState<(Entry & { department: string })[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");

  const load = useCallback(async () => {
    const [{ data: depts }, { data: entries }] = await Promise.all([
      api.from("departments").select("id,name"),
      api
        .from("feedback_entries")
        .select("id,patient_name,visit_type,department_id,rating_overall,rating_cleanliness,rating_staff,rating_wait_time,comments,submitted_at")
        .order("submitted_at", { ascending: false }),
    ]);
    const deptMap = new Map((depts ?? []).map((d) => [d.id, d.name]));
    const all = (entries ?? []) as Entry[];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    setToday(all.filter((e) => new Date(e.submitted_at) >= startOfDay).length);
    setOverall(all.length ? all.reduce((a, e) => a + e.rating_overall, 0) / all.length : 0);
    const byDept = new Map<string, { sum: number; count: number }>();
    for (const e of all) {
      const name = deptMap.get(e.department_id) ?? "Unknown";
      const cur = byDept.get(name) ?? { sum: 0, count: 0 };
      cur.sum += e.rating_overall;
      cur.count += 1;
      byDept.set(name, cur);
    }
    setDeptStats(
      Array.from(byDept.entries())
        .map(([name, { sum, count }]) => ({ name, avg: sum / count, count }))
        .sort((a, b) => b.avg - a.avg),
    );
    setLatest(
      all.slice(0, 10).map((e) => ({ ...e, department: deptMap.get(e.department_id) ?? "Unknown" })),
    );
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [ready, load]);

  if (!ready || loading) {
    return (
      <AdminShell title="Dashboard">
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Dashboard">
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Last updated {lastUpdated} · auto-refreshes every 30s</span>
        <button onClick={() => void load()} className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Today's feedback" value={today.toString()} accent="text-indigo-600" />
        <StatCard icon={<Star className="h-4 w-4" />} label="Overall average" value={overall ? `★ ${overall.toFixed(2)}` : "—"} accent="text-amber-500" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Departments tracked" value={deptStats.length.toString()} accent="text-emerald-600" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side Small Card: Department ratings */}
        <section className="lg:col-span-1 rounded-2xl border bg-card p-5 shadow-sm h-fit">
          <h2 className="mb-4 text-sm font-semibold">Department ratings</h2>
          {deptStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            <div className="space-y-3">
              {deptStats.map((d) => (
                <div key={d.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">★ {d.avg.toFixed(2)}</span> · {d.count} responses
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${(d.avg / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Side Table Card: Latest submissions */}
        <section className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-sm overflow-hidden">
          <h2 className="mb-4 text-sm font-semibold">Latest submissions</h2>
          {latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            <div className="-mx-5 -mb-5 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-secondary/40 text-muted-foreground border-b uppercase tracking-wider text-[10px] font-semibold">
                  <tr>
                    <th className="px-5 py-3 font-medium">When</th>
                    <th className="px-5 py-3 font-medium">Patient</th>
                    <th className="px-5 py-3 font-medium">Visit</th>
                    <th className="px-5 py-3 font-medium">Department</th>
                    <th className="px-5 py-3 font-medium text-center">Rating</th>
                    <th className="px-5 py-3 font-medium">Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {latest.map((e) => (
                    <tr key={e.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(e.submitted_at).toLocaleDateString()} {new Date(e.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 font-medium whitespace-nowrap">
                        {e.patient_name || <span className="text-muted-foreground italic">Anonymous</span>}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                          {e.visit_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">{e.department}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/10">
                          ★ {e.rating_overall}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-xs whitespace-normal break-words text-muted-foreground">
                        {e.comments || <span className="text-muted-foreground/30">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className={`mb-2 flex items-center gap-1.5 text-xs font-medium ${accent}`}>
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
