import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Hospital, QrCode, ScanLine, Star } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KauFeedback — Scan to share your hospital feedback" },
      { name: "description", content: "Scan the QR code to rate your hospital visit in under a minute. Anonymous, fast and secure." },
      { property: "og:title", content: "KauFeedback — Scan to share your hospital feedback" },
      { property: "og:description", content: "Scan the QR code to rate your hospital visit in under a minute." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [feedbackUrl, setFeedbackUrl] = useState("/feedback?location=e4e1a66b-8b54-4a4a-9c7f-f7d1217e9154");

  useEffect(() => {
    setFeedbackUrl(`${window.location.origin}/feedback?location=e4e1a66b-8b54-4a4a-9c7f-f7d1217e9154`);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Hospital className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">KauFeedback</span>
        </div>
        <Link
          to="/auth"
          className="rounded-lg border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
        >
          Staff sign in
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-10 md:grid-cols-2 md:py-20">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-medium text-indigo-700">
            <ScanLine className="h-3.5 w-3.5" /> Point your camera at the code
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            How was your visit today?
          </h1>
          <p className="max-w-md text-base text-muted-foreground">
            Scan the QR code with your phone camera to rate cleanliness, staff, your
            doctor and overall experience. Takes under a minute — and stays anonymous
            unless you choose to share your name.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/feedback"
              search={{ location: "e4e1a66b-8b54-4a4a-9c7f-f7d1217e9154" }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Open feedback form
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              How it works
            </a>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-6">
            {[
              { k: "< 1 min", v: "to complete" },
              { k: "Anonymous", v: "by default" },
              { k: "5-star", v: "ratings" },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border bg-card p-3 text-center">
                <div className="text-sm font-bold text-foreground">{s.k}</div>
                <div className="text-[11px] text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex justify-center">
          <div className="w-full max-w-sm rounded-3xl border bg-card p-8 shadow-xl">
            <div className="mb-4 flex items-center justify-center gap-2 text-xs font-medium text-indigo-700">
              <QrCode className="h-4 w-4" /> Scan to rate your visit
            </div>
            <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-white p-6">
              <QRCodeSVG
                value={feedbackUrl}
                size={232}
                level="M"
                marginSize={0}
                fgColor="#312e81"
              />
            </div>
            <p className="mt-4 text-center text-[11px] break-all text-muted-foreground">
              {feedbackUrl}
            </p>
            <div className="mt-5 flex items-center justify-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400" />
              ))}
            </div>
          </div>
        </section>
      </main>

      <section id="how" className="border-t bg-white/60 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">How it works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { n: "1", t: "Scan the code", d: "Open your phone's camera and point it at the QR code above." },
              { n: "2", t: "Rate your visit", d: "Pick your department and doctor, then rate them out of 5." },
              { n: "3", t: "Submit", d: "Add an optional comment and tap submit. That's it." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border bg-card p-6">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mb-1 text-base font-semibold">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} KauFeedback · Helping hospitals listen better
      </footer>
    </div>
  );
}
