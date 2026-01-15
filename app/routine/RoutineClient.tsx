"use client";

import React, { useEffect, useActionState, startTransition } from "react";
import Link from "next/link";

type RoutineBlock = {
  start: string;
  end: string;
  icon: string;
  title: string;
  bullets: string[];
};

type PlanOk = { ok: true; routineBlocks: RoutineBlock[] };
type PlanFail = { ok: false; message: string };
type PlanResponse = PlanOk | PlanFail;

type ViewState =
  | { status: "boot" }
  | { status: "noauth" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PlanOk };

function minutesNow(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function parseTimeToMinutes(t: string): number {
  const parts = t.split(":");
  const hh = Number(parts[0] ?? "0");
  const mm = Number(parts[1] ?? "0");
  return hh * 60 + mm;
}

function isCurrent(block: RoutineBlock): boolean {
  const now = minutesNow();
  const s = parseTimeToMinutes(block.start);
  const e = parseTimeToMinutes(block.end);
  return now >= s && now < e;
}

async function loadRoutineAction(
  _prev: ViewState,
  payload: { email: string | null }
): Promise<ViewState> {
  const email = (payload.email ?? "").trim();
  if (!email) return { status: "noauth" };

  try {
    const res = await fetch(`/api/plan?email=${encodeURIComponent(email)}`);
    const json = (await res.json()) as PlanResponse;

    if (!res.ok || !json.ok) {
      const msg = "message" in json ? json.message : "Failed to load routine.";
      return { status: "error", message: msg };
    }

    return { status: "ready", data: json };
  } catch {
    return { status: "error", message: "Failed to load routine." };
  }
}

function TopBar() {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white">
            <span className="text-sm font-bold">◎</span>
          </div>
          <span className="text-lg font-semibold text-slate-900">RoutineForge</span>
        </div>

        <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function RoutineClient() {
  const [view, runLoad] = useActionState(loadRoutineAction, { status: "boot" } as ViewState);

 useEffect(() => {
  const email = localStorage.getItem("rf_email");
  startTransition(() => {
    runLoad({ email });
  });
}, [runLoad]);


  return (
    <main className="min-h-screen bg-white">
      <TopBar />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {view.status === "boot" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
            Loading routine…
          </div>
        ) : view.status === "noauth" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            No login found. Please log in again.{" "}
            <Link href="/login" className="font-semibold underline underline-offset-2">
              Go to login
            </Link>
          </div>
        ) : view.status === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {view.message}
          </div>
        ) : (
          <RoutineTimeline blocks={view.data.routineBlocks} />
        )}
      </div>
    </main>
  );
}

function RoutineTimeline({ blocks }: { blocks: RoutineBlock[] }) {
  return (
    <div>
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          Your Daily Routine
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          A personalized schedule designed around your lifestyle
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-4xl">
        <div className="relative">
          <div className="absolute left-5 top-0 h-full w-px bg-slate-200" />

          <div className="space-y-10">
            {blocks.map((b: RoutineBlock) => {
              const current = isCurrent(b);

              return (
                <div key={`${b.start}-${b.title}`} className="relative pl-16">
                  <div
                    className={[
                      "absolute left-0 top-1 grid h-10 w-10 place-items-center rounded-full border",
                      current
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
                        : "border-slate-200 bg-slate-50 text-slate-700",
                    ].join(" ")}
                  >
                    <span className="text-sm">{b.icon}</span>
                  </div>

                  <div className="mb-3 flex items-center gap-3 text-sm text-slate-600">
                    <span className="font-medium">
                      {b.start} - {b.end}
                    </span>
                    {current ? (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                        Current
                      </span>
                    ) : null}
                  </div>

                  <div
                    className={[
                      "rounded-2xl border bg-white p-6 shadow-sm",
                      current ? "border-emerald-600 shadow-emerald-100" : "border-slate-200",
                    ].join(" ")}
                  >
                    <h3 className="text-base font-semibold text-slate-900">{b.title}</h3>

                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      {b.bullets.map((x: string) => (
                        <li key={x} className="flex items-start gap-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

      <div className="mt-14 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
  <p className="text-sm font-semibold text-slate-900">💡 Pro Tips</p>

  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
    <li>Try to maintain consistent wake and sleep times, even on weekends</li>
    <li>Take short 5-minute breaks every hour during work blocks</li>
    <li>Avoid screens 30 minutes before bedtime for better sleep quality</li>
    <li>Stay hydrated throughout the day - aim for 8 glasses of water</li>
  </ul>
</div>

        </div>
      </div>

      <div className="fixed bottom-6 right-6 grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white shadow-lg">
        ?
      </div>
    </div>
  );
}
