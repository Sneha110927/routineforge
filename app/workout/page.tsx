"use client";

import React, { useEffect, useMemo, useActionState } from "react";
import Link from "next/link";

type WorkoutItem = {
  title: string;
  subtitle: string;
  durationMin: number;
  items: Array<{ name: string; setsReps: string }>;
};

type PlanOk = { ok: true; workout: WorkoutItem };
type PlanFail = { ok: false; message: string };
type PlanResponse = PlanOk | PlanFail;

type ViewState =
  | { status: "noauth" }
  | { status: "loading"; email: string }
  | { status: "error"; message: string }
  | { status: "ready"; data: PlanOk };

function readEmail(): string {
  return localStorage.getItem("rf_email") ?? "";
}

async function loadWorkoutAction(_: ViewState, payload: { email: string }): Promise<ViewState> {
  try {
    const res = await fetch(`/api/plan?email=${encodeURIComponent(payload.email)}`);
    const json = (await res.json()) as PlanResponse;

    if (!res.ok || !json.ok) {
      const msg = "message" in json ? json.message : "Failed to load workout.";
      return { status: "error", message: msg };
    }

    return { status: "ready", data: json };
  } catch {
    return { status: "error", message: "Failed to load workout." };
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

function WorkoutHeaderCard({ workout }: { workout: WorkoutItem }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">🏋️ {workout.title}</p>
          <p className="mt-1 text-sm text-emerald-800/80">{workout.subtitle}</p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
          ⏱️ {workout.durationMin} min
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatChip label="Warm-up" value="5 min" />
        <StatChip label="Workout" value={`${Math.max(10, workout.durationMin - 10)} min`} />
        <StatChip label="Cool-down" value="5 min" />
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-4 py-3">
      <p className="text-xs font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
    </div>
  );
}

function ExerciseRow({ name, setsReps }: { name: string; setsReps: string }) {
  return (
    <div className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          ✅
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">Form first, then speed</p>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-700">
        {setsReps}
      </div>
    </div>
  );
}

export default function WorkoutPage() {
  const initial = useMemo<ViewState>(() => {
    const email = readEmail();
    return email ? { status: "loading", email } : { status: "noauth" };
  }, []);

  const [view, runLoad] = useActionState(loadWorkoutAction, initial);

  useEffect(() => {
    if (view.status !== "loading") return;
    runLoad({ email: view.email });
  }, [view, runLoad]);

  return (
    <main className="min-h-screen bg-white">
      <TopBar />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {view.status === "noauth" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            No login found. Please log in again.{" "}
            <Link href="/login" className="font-semibold underline underline-offset-2">
              Go to login
            </Link>
          </div>
        ) : view.status === "loading" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
            Loading workout…
          </div>
        ) : view.status === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {view.message}
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
                Today&apos;s Workout
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Personalized workout based on your goal, experience, and available time
              </p>
            </div>

            <div className="mt-10">
              <WorkoutHeaderCard workout={view.data.workout} />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4">
              <SectionTitle title="Warm-up" desc="Get your body ready (5 minutes)" />
              <ExerciseRow name="Light jogging in place" setsReps="5 min" />
              <ExerciseRow name="Shoulder + hip mobility" setsReps="2 min" />

              <SectionTitle title="Main workout" desc="Follow the sets & reps below" />
              {view.data.workout.items.map((x) => (
                <ExerciseRow key={x.name} name={x.name} setsReps={x.setsReps} />
              ))}

              <SectionTitle title="Cool-down" desc="Bring your heart rate down (5 minutes)" />
              <ExerciseRow name="Stretch (hamstrings, chest, back)" setsReps="5 min" />
            </div>

            <div className="mt-10 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-8 text-center">
              <p className="text-sm font-semibold text-slate-900">Tip</p>
              <p className="mt-2 text-sm text-slate-600">
                Track completion in Log Today to build your streak. Consistency is the goal.
              </p>
              <Link
                href="/tracker"
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Log Today&apos;s Workout
              </Link>
            </div>

            <div className="fixed bottom-6 right-6 grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white shadow-lg">
              ?
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mt-2">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{desc}</p>
    </div>
  );
}
