import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import { AdminShell } from "@/components/AdminShell";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/manage")({
  component: ManagePage,
});

interface Dept { id: string; name: string; }
interface Service { id: string; name: string; department_id: string; designation: string | null; }

function ManagePage() {
  const ready = useAdminGuard();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [newDept, setNewDept] = useState("");
  const [newService, setNewService] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [serviceDept, setServiceDept] = useState("");
  const [busy, setBusy] = useState(false);


  const load = useCallback(async () => {
    const [d, s] = await Promise.all([
      api.from("departments").select("id,name").order("name"),
      api.from("services").select("id,name,department_id,designation").order("name"),
    ]);
    setDepts(d.data ?? []);
    setServices((s.data ?? []) as Service[]);
  }, []);


  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  async function addDept(e: React.FormEvent) {
    e.preventDefault();
    if (!newDept.trim()) return;
    setBusy(true);
    const { error } = await api.from("departments").insert({ name: newDept.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? "Department already exists." : "Could not add department.");
      return;
    }
    toast.success("Department added");
    setNewDept("");
    void load();
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!newService.trim() || !serviceDept) return;
    setBusy(true);
    const { error } = await api.from("services").insert({
      name: newService.trim(),
      department_id: serviceDept,
      designation: newDesignation.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not add doctor.");
      return;
    }
    toast.success("Doctor added");
    setNewService("");
    setNewDesignation("");
    void load();
  }


  if (!ready) return null;

  return (
    <AdminShell title="Manage departments & services">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">Departments</h2>
          <form onSubmit={addDept} className="mb-4 flex gap-2">
            <input
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              placeholder="New department name"
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add
            </button>
          </form>
          <ul className="divide-y text-sm">
            {depts.map((d) => (
              <li key={d.id} className="py-2">{d.name}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">Doctors & services</h2>
          <form onSubmit={addService} className="mb-4 space-y-2">
            <select
              value={serviceDept}
              onChange={(e) => setServiceDept(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose a department…</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Dr. Priya Nair"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                placeholder="Designation (e.g. MBBS, MD)"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={busy || !serviceDept}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add
              </button>
            </div>
          </form>
          <ul className="divide-y text-sm">
            {services.map((s) => {
              const dept = depts.find((d) => d.id === s.department_id);
              return (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <span>
                    <span className="font-medium">{s.name}</span>
                    {s.designation && (
                      <span className="ml-2 text-xs text-muted-foreground">{s.designation}</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">{dept?.name ?? "—"}</span>
                </li>
              );
            })}
          </ul>

        </section>
      </div>
    </AdminShell>
  );
}
