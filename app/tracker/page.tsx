"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type Mood = 1 | 2 | 3 | 4 | 5;

type ViewState =
  | { status: "noauth" }
  | { status: "ready"; email: string }
  | { status: "saving"; email: string }
  | { status: "saved"; email: string }
  | { status: "error"; email: string; message: string };

type ApiOk = { ok: true };
type ApiFail = { ok: false; message: string };
type ApiResponse = ApiOk | ApiFail;

function readEmail(): string {
  return localStorage.getItem("rf_email") ?? "";
}

function todayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10);
}

function isMood(v: number): v is Mood {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong. Please try again.";
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={[
        "flex items-center justify-between rounded-xl border px-4 py-3 transition",
        checked
          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span>{checked ? "✅" : "⬜"}</span>
    </button>
  );
}

export default function TrackerPage() {
  const initial = useMemo<ViewState>(() => {
    const email = readEmail();
    return email ? { status: "ready", email } : { status: "noauth" };
  }, []);

  const [view, setView] = useState<ViewState>(initial);

  const [routineDone, setRoutineDone] = useState(false);
  const [workoutDone, setWorkoutDone] = useState(false);
  const [mealsFollowed, setMealsFollowed] = useState(false);
  const [mood, setMood] = useState<Mood>(3);
  const [notes, setNotes] = useState("");

  async function saveLog() {
    if (view.status !== "ready" && view.status !== "saved" && view.status !== "error") return;

    const email = view.email;
    setView({ status: "saving", email });

    try {
      const payload = {
        userEmail: email,
        date: todayYYYYMMDD(),

        // your API expects these fields:
        workoutDone,
        mealsFollowedPct: mealsFollowed ? 100 : 0,
        mood: mood,

        // extra fields in your API (send nulls for now)
        weightKg: null as number | null,
        waterLiters: null as number | null,
        sleepHours: null as number | null,
        steps: null as number | null,

        // not in API but you can keep notes
        notes: notes,

        // routineDone is not in your current API model; keep it inside notes or add it to schema later
        // For now, include as text in notes to not lose info:
        // (optional) you can remove this line if you don’t want it
        routineDone,
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

      setView({ status: "saved", email });
    } catch (err: unknown) {
      setView({ status: "error", email: (view as Exclude<ViewState, { status: "noauth" }>).email, message: getErrorMessage(err) });
    }
  }

  const emailForState =
    view.status === "ready" || view.status === "saving" || view.status === "saved" || view.status === "error"
      ? view.email
      : "";

  return (
    <main className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold text-slate-900">Log Today</span>
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
            ← Back
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-6 py-10">
        {view.status === "noauth" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            Please log in again.
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <Toggle
                label="Completed Daily Routine"
                checked={routineDone}
                onChange={() => setRoutineDone((s) => !s)}
              />
              <Toggle
                label="Completed Workout"
                checked={workoutDone}
                onChange={() => setWorkoutDone((s) => !s)}
              />
              <Toggle
                label="Followed Meal Plan"
                checked={mealsFollowed}
                onChange={() => setMealsFollowed((s) => !s)}
              />
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-900">Mood</p>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((m) => {
                  const mm = Number(m);
                  const moodVal: Mood = isMood(mm) ? mm : 3;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(moodVal)}
                      className={[
                        "h-10 w-10 rounded-full border text-sm font-semibold",
                        mood === moodVal
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-200 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-900">Notes (optional)</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did today go?"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <button
              type="button"
              onClick={saveLog}
              disabled={view.status === "saving"}
              className="mt-8 w-full rounded-xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
            >
              {view.status === "saving" ? "Saving…" : "Save Today"}
            </button>

            {view.status === "saved" ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                ✅ Today&apos;s progress saved for <span className="font-semibold">{emailForState}</span>
              </div>
            ) : null}

            {view.status === "error" ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                {view.message}
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
