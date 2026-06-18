import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/thank-you")({
  head: () => ({
    meta: [
      { title: "Thank you — KauFeedback" },
      { name: "description", content: "Your feedback has been recorded." },
    ],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4">
      <div className="max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Thank you!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your feedback has been recorded. We use every response to improve patient care.
        </p>
        <Link
          to="/feedback"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Submit another
        </Link>
      </div>
    </div>
  );
}
