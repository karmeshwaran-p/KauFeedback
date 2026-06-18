import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/integrations/api/client";
import { StarRating } from "@/components/StarRating";
import { toast } from "sonner";
import { Loader2, QrCode } from "lucide-react";

const VISIT_TYPES = ["OPD", "Inpatient", "Emergency", "Pharmacy", "Lab"] as const;
type VisitType = (typeof VISIT_TYPES)[number];

const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  OPD: "Outpatient (OPD)",
  Inpatient: "Inpatient",
  Emergency: "Emergency",
  Pharmacy: "Pharmacy",
  Lab: "Lab",
};

interface Dept { id: string; name: string; }
interface Service { id: string; name: string; department_id: string; designation: string | null; }
interface Location { id: string; name: string; floor: string | null; ward: string | null; }

interface SearchParams {
  dept?: string;
  location?: string;
}

export const Route = createFileRoute("/feedback")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    dept: typeof s.dept === "string" ? s.dept : undefined,
    location: typeof s.location === "string" ? s.location : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Share Your Feedback — KauFeedback" },
      { name: "description", content: "Help us improve your hospital experience. Rate your visit in under a minute." },
    ],
  }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const search = useSearch({ from: "/feedback" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    patient_name: "",
    age: "",
    visit_type: "OPD" as VisitType,
    department_id: search.dept ?? "",
    service_id: "",
    location_id: search.location ?? "",
    rating_doctor: 0,
    rating_cleanliness: 0,
    rating_staff: 0,
    rating_wait_time: 0,
    rating_overall: 0,
    comments: "",
  });


  useEffect(() => {
    (async () => {
      const [d, s, l] = await Promise.all([
        api.from("departments").select("id,name").eq("is_active", true).order("name"),
        api.from("services").select("id,name,department_id,designation").eq("is_active", true).order("name"),
        api.from("locations").select("id,name,floor,ward").eq("is_active", true).order("name"),
      ]);
      if (d.error || s.error || l.error) {
        toast.error("Could not load the form. Please refresh.");
      } else {
        setDepartments(d.data ?? []);
        setServices((s.data ?? []) as Service[]);
        setLocations(l.data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const filteredDoctors = useMemo(
    () => services.filter((s) => s.department_id === form.department_id),
    [services, form.department_id],
  );
  const selectedDoctor = filteredDoctors.find((d) => d.id === form.service_id);
  const selectedLocation = locations.find((l) => l.id === form.location_id);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.department_id) e.department_id = "Please select a department";
    if (!form.service_id) e.service_id = "Please select a doctor";
    if (!form.rating_doctor) e.rating_doctor = "Required";
    if (!form.rating_cleanliness) e.rating_cleanliness = "Required";
    if (!form.rating_staff) e.rating_staff = "Required";
    if (!form.rating_wait_time) e.rating_wait_time = "Required";
    if (!form.rating_overall) e.rating_overall = "Required";
    if (form.comments.length > 200) e.comments = "Max 200 characters";
    if (form.age && (Number(form.age) < 1 || Number(form.age) > 149)) e.age = "Enter a valid age";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Please complete all required fields.");
      return;
    }
    setSubmitting(true);
    const { error } = await api.from("feedback_entries").insert({
      patient_name: form.patient_name || null,
      age: form.age ? Number(form.age) : null,
      visit_type: form.visit_type,
      admitted_date: null,
      relieved_date: null,
      department_id: form.department_id,
      service_id: form.service_id || null,
      location_id: form.location_id || null,
      rating_doctor: form.rating_doctor,
      rating_cleanliness: form.rating_cleanliness,
      rating_staff: form.rating_staff,
      rating_wait_time: form.rating_wait_time,
      rating_overall: form.rating_overall,
      comments: form.comments || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit feedback. Please try again.");
      return;
    }
    navigate({ to: "/thank-you" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-4 py-6 sm:py-12">
      <div className="mx-auto max-w-xl">
        <header className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-medium text-indigo-700">
            <QrCode className="h-3.5 w-3.5" /> KauFeedback
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">How was your visit?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your feedback takes under a minute and stays anonymous unless you share your name.
          </p>
          {selectedLocation && (
            <p className="mt-3 text-xs text-indigo-700">
              📍 {selectedLocation.name}
              {selectedLocation.floor ? ` · ${selectedLocation.floor}` : ""}
            </p>
          )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          {/* Patient details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Name (optional)</label>
              <input
                type="text"
                value={form.patient_name}
                onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
                placeholder="Your name"
                maxLength={100}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Age (optional)</label>
              <input
                type="number"
                min={1}
                max={149}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="Age"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.age && <p className="mt-1 text-xs text-destructive">{errors.age}</p>}
            </div>
          </div>

          {/* Visit type */}
          <div>
            <label className="mb-2 block text-xs font-medium text-foreground">Visit type *</label>
            <div className="flex flex-wrap gap-2">
              {VISIT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, visit_type: t })}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    form.visit_type === t
                      ? "bg-indigo-600 text-white"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {VISIT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>


          {/* Department */}
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Department *</label>
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value, service_id: "", rating_doctor: 0 })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.department_id && <p className="mt-1 text-xs text-destructive">{errors.department_id}</p>}
          </div>

          {/* Doctor — only shown after department selected */}
          {form.department_id && (
            <div>
              <label className="mb-2 block text-xs font-medium text-foreground">Doctor *</label>
              {filteredDoctors.length === 0 ? (
                <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                  No doctors are listed for this department yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredDoctors.map((doc) => (
                    <button
                      type="button"
                      key={doc.id}
                      onClick={() => setForm({ ...form, service_id: doc.id })}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        form.service_id === doc.id
                          ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20"
                          : "bg-background hover:bg-secondary/60"
                      }`}
                    >
                      <span className="font-medium text-foreground">{doc.name}</span>
                      {doc.designation && (
                        <span className="text-xs text-muted-foreground">{doc.designation}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {errors.service_id && <p className="mt-1 text-xs text-destructive">{errors.service_id}</p>}
            </div>
          )}

          {/* Doctor rating */}
          {selectedDoctor && (
            <div className="rounded-xl border bg-indigo-50/40 p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Rate {selectedDoctor.name}
                {selectedDoctor.designation && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({selectedDoctor.designation})
                  </span>
                )}
              </h2>
              <StarRating
                label="Doctor's work & care"
                value={form.rating_doctor}
                onChange={(v) => setForm({ ...form, rating_doctor: v })}
                error={errors.rating_doctor}
              />
            </div>
          )}

          {/* Hospital environment ratings */}
          <div className="space-y-4 border-t pt-5">
            <h2 className="text-sm font-semibold text-foreground">Hospital environment *</h2>
            <StarRating label="Cleanliness" value={form.rating_cleanliness} onChange={(v) => setForm({ ...form, rating_cleanliness: v })} error={errors.rating_cleanliness} />
            <StarRating label="Staff behaviour" value={form.rating_staff} onChange={(v) => setForm({ ...form, rating_staff: v })} error={errors.rating_staff} />
            <StarRating label="Wait time" value={form.rating_wait_time} onChange={(v) => setForm({ ...form, rating_wait_time: v })} error={errors.rating_wait_time} />
            <StarRating label="Overall experience" value={form.rating_overall} onChange={(v) => setForm({ ...form, rating_overall: v })} error={errors.rating_overall} />
          </div>

          {/* Comments */}
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Comments (optional)</label>
            <textarea
              value={form.comments}
              onChange={(e) => setForm({ ...form, comments: e.target.value })}
              rows={3}
              maxLength={200}
              placeholder="Tell us what worked, or what we can improve…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{form.comments.length}/200</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting…" : "Submit feedback"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Hospital staff?{" "}
            <Link to="/auth" className="font-medium text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
