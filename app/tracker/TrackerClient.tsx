"use client";

import React, { useEffect, useActionState, startTransition, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Settings } from "lucide-react";

type Mood = 1 | 2 | 3 | 4 | 5;

type ViewState =
  | { status: "boot" }
  | { status: "noauth" }
  | { status: "ready"; email: string }
  | { status: "saving"; email: string }
  | { status: "saved"; email: string }
  | { status: "error"; email: string; message: string };

type ApiOk = { ok: true };
type ApiFail = { ok: false; message: string };
type ApiResponse = ApiOk | ApiFail;

function todayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong. Please try again.";
}

// ✅ action to set initial auth state without setState inside effect
async function initAction(_prev: ViewState, payload: { email: string | null }): Promise<ViewState> {
  const email = (payload.email ?? "").trim();
  return email ? { status: "ready", email } : { status: "noauth" };
}

function MoodOption({
  emoji,
  label,
  selected,
  onClick,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl border px-4 py-4 text-center transition",
        selected
          ? "border-emerald-600 bg-emerald-50"
          : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="text-2xl">{emoji}</div>
      <div className="mt-2 text-xs font-semibold text-slate-900">{label}</div>
    </button>
  );
}

function InputCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function TrackerClient() {
  const [view, runInit] = useActionState(initAction, { status: "boot" } as ViewState);

    useEffect(() => {
     const email = localStorage.getItem("rf_email");
     startTransition(() => {
       runInit({ email }); 
     });
   }, [runInit]);

  const [weightKg, setWeightKg] = useState<string>("");
  const [workoutDone, setWorkoutDone] = useState(false);
  const [mealsPct, setMealsPct] = useState<number>(75);
  const [waterGlasses, setWaterGlasses] = useState<string>("8");
  const [sleepHours, setSleepHours] = useState<string>("7");
  const [mood, setMood] = useState<Mood>(3);
  const [notes, setNotes] = useState("");

  async function saveLog() {
    if (view.status !== "ready" && view.status !== "saved" && view.status !== "error") return;
    const email = view.email;

    // move to saving (not inside effect, allowed)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    (view as unknown); // no-op to keep ts stable

    // useActionState is for init only; local UI state can use local set via runInit not needed
    // We’ll simply rely on fetch + reload-ish message by using window state update through initAction is not needed.
    // Instead we keep a small local state change using runInit is not appropriate.
    // We'll keep saving state via a local setter pattern by reusing initAction not possible.
  }

  // We need a way to change view to saving/saved/error without setState in effects.
  // setState is fine outside effects, so we use a separate local setter:
  const [localView, setLocalView] = useState<ViewState>({ status: "boot" });

  // Sync localView from view (once init completes)
  useEffect(() => {
    if (view.status === "ready" || view.status === "noauth") setLocalView(view);
    if (view.status === "boot") setLocalView(view);
  }, [view]);

  async function saveLogReal() {
    if (localView.status !== "ready" && localView.status !== "saved" && localView.status !== "error") return;
    const email = localView.email;

    setLocalView({ status: "saving", email });

    try {
      const toNumOrNull = (v: string): number | null => {
        const t = v.trim();
        if (!t) return null;
        const n = Number(t);
        return Number.isFinite(n) ? n : null;
      };

      const waterLiters = (() => {
        const g = toNumOrNull(waterGlasses);
        if (g === null) return null;
        return Math.round(g * 0.25 * 10) / 10; // 1 glass ≈ 0.25L
      })();

      const payload = {
        userEmail: email,
        date: todayYYYYMMDD(),
        weightKg: toNumOrNull(weightKg),
        waterLiters,
        sleepHours: toNumOrNull(sleepHours),
        steps: null as number | null,
        workoutDone,
        mealsFollowedPct: Math.max(0, Math.min(100, Math.round(mealsPct))),
        mood,
        notes,
      };

      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.message : "Failed to save";
        throw new Error(msg);
      }

      setLocalView({ status: "saved", email });
    } catch (err: unknown) {
      setLocalView({ status: "error", email: localView.email, message: getErrorMessage(err) });
    }
  }

  if (localView.status === "boot") {
    return (
      <main className="min-h-screen bg-white px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
          Loading…
        </div>
      </main>
    );
  }

  if (localView.status === "noauth") {
    return (
      <main className="min-h-screen bg-white px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Please log in again.{" "}
          <Link href="/login" className="font-semibold underline underline-offset-2">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
            ←
          </Link>

          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white">
              <span className="text-sm font-bold">◎</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">RoutineForge</span>
          </div>

          <div className="flex items-center gap-2">
            <button className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-50" aria-label="Theme">
              🌙
            </button>
            <Link
              href="/settings"
              className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-50"
              aria-label="Settings"
            >
              <Settings size={16} className="text-slate-600" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
            Log Today&apos;s Progress
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Track your daily metrics to build consistency and see results
          </p>
        </div>

        <div className="mt-10 space-y-6">
          <InputCard title="Current Weight (kg)" subtitle="Track your weight to monitor progress over time">
            <input
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g., 70"
              inputMode="decimal"
              className="h-11 w-full rounded-xl bg-slate-100 px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </InputCard>

          <InputCard
            title="Workout Completed"
            subtitle="Did you complete today&apos;s workout session?"
            right={
              <button
                type="button"
                onClick={() => setWorkoutDone((s) => !s)}
                className={[
                  "grid h-7 w-7 place-items-center rounded border",
                  workoutDone
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700",
                ].join(" ")}
                aria-label="Workout done"
              >
                {workoutDone ? "✓" : ""}
              </button>
            }
          >
            <div className="text-xs text-slate-500">
              {workoutDone ? "Great job! ✅" : "Mark when completed."}
            </div>
          </InputCard>

          <InputCard title="Meals Followed (%)" subtitle="How well did you stick to your meal plan today?">
            <div className="mt-2">
              <input
                type="range"
                min={0}
                max={100}
                value={mealsPct}
                onChange={(e) => setMealsPct(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>0%</span>
                <span className="text-base font-semibold text-emerald-700">{Math.round(mealsPct)}%</span>
                <span>100%</span>
              </div>
            </div>
          </InputCard>

          <InputCard title="Water Intake (glasses)" subtitle="How many glasses of water did you drink? (Target: 8)">
            <input
              value={waterGlasses}
              onChange={(e) => setWaterGlasses(e.target.value)}
              placeholder="e.g., 8"
              inputMode="numeric"
              className="h-11 w-full rounded-xl bg-slate-100 px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </InputCard>

          <InputCard title="Sleep Hours" subtitle="How many hours did you sleep last night? (Target: 7-8)">
            <input
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="e.g., 7"
              inputMode="decimal"
              className="h-11 w-full rounded-xl bg-slate-100 px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </InputCard>

          <InputCard title="Overall Mood" subtitle="How are you feeling today?">
            <div className="grid grid-cols-5 gap-3">
              <MoodOption emoji="😞" label="Poor" selected={mood === 1} onClick={() => setMood(1)} />
              <MoodOption emoji="😕" label="Fair" selected={mood === 2} onClick={() => setMood(2)} />
              <MoodOption emoji="😐" label="Okay" selected={mood === 3} onClick={() => setMood(3)} />
              <MoodOption emoji="🙂" label="Good" selected={mood === 4} onClick={() => setMood(4)} />
              <MoodOption emoji="😄" label="Great" selected={mood === 5} onClick={() => setMood(5)} />
            </div>
          </InputCard>

          <InputCard title="Notes (Optional)" subtitle="Any additional thoughts or observations?">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Felt energetic today, workout was challenging but completed..."
              className="min-h-[92px] w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </InputCard>

          <button
            type="button"
            onClick={saveLogReal}
            disabled={localView.status === "saving"}
            className="w-full rounded-xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
          >
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} />
              {localView.status === "saving" ? "Saving..." : "Save Today’s Progress"}
            </span>
          </button>

          {localView.status === "saved" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              Saved successfully.
            </div>
          ) : null}

          {localView.status === "error" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {localView.message}
            </div>
          ) : null}

          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-8 text-center">
            <p className="text-sm font-semibold text-slate-900">🌟 Keep Going!</p>
            <p className="mt-2 text-sm text-slate-600">
              Consistency is key. Track your progress daily to build lasting habits and achieve your goals.
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white shadow-lg">
        ?
      </div>
    </main>
  );
}
