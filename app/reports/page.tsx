"use client";

import React, { useEffect, useMemo, useActionState } from "react";
import Link from "next/link";
import { LineChart } from "lucide-react";

type Mood = 1 | 2 | 3 | 4 | 5;

type LogDoc = {
  date: string;
  weightKg: number | null;
  waterLiters: number | null;
  sleepHours: number | null;
  steps: number | null;
  workoutDone: boolean;
  mealsFollowedPct: number;
  mood: Mood;
  notes: string;
};

type ReportsOk = {
  ok: true;
  logs: LogDoc[];
  summary: {
    daysLogged: number;
    currentStreak: number;
    workoutsDone: number;
    avgMealsPct: number;
    avgSleep: number | null;
    avgWater: number | null;
    latestWeight: number | null;
  };
};

type ReportsFail = { ok: false; message: string };
type ReportsResponse = ReportsOk | ReportsFail;

type ViewState =
  | { status: "noauth" }
  | { status: "loading"; email: string }
  | { status: "error"; message: string }
  | { status: "ready"; data: ReportsOk };

function readEmail(): string {
  return localStorage.getItem("rf_email") ?? "";
}

function moodEmoji(m: Mood): string {
  if (m === 1) return "😞";
  if (m === 2) return "😕";
  if (m === 3) return "😐";
  if (m === 4) return "🙂";
  return "😄";
}

async function loadReportsAction(_: ViewState, payload: { email: string }): Promise<ViewState> {
  try {
    const res = await fetch(`/api/reports?email=${encodeURIComponent(payload.email)}&days=30`);
    const json = (await res.json()) as ReportsResponse;

    if (!res.ok || !json.ok) {
      const msg = "message" in json ? json.message : "Failed to load reports.";
      return { status: "error", message: msg };
    }
    return { status: "ready", data: json };
  } catch {
    return { status: "error", message: "Failed to load reports." };
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
          ← Back
        </Link>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const initial = useMemo<ViewState>(() => {
    const email = readEmail();
    return email ? { status: "loading", email } : { status: "noauth" };
  }, []);

  const [view, runLoad] = useActionState(loadReportsAction, initial);

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
            Loading reports…
          </div>
        ) : view.status === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {view.message}
          </div>
        ) : (
          <ReportsContent data={view.data} />
        )}
      </div>
    </main>
  );
}

function ReportsContent({ data }: { data: ReportsOk }) {
  const hasData = data.logs.length > 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Progress Reports</h1>
        <p className="mt-2 text-sm text-slate-600">Track your journey and celebrate your wins</p>
      </div>

      {!hasData ? (
        // ✅ exact empty state layout like screenshot
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 shadow-sm">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-700">
              <LineChart size={22} />
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-900">No data yet</p>
            <p className="mt-2 text-sm text-slate-600">
              Start logging your daily progress to see insights and analytics here.
            </p>

            <Link
              href="/tracker"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Log Your First Day
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard title="Days Logged" value={`${data.summary.daysLogged}`} />
            <SummaryCard title="Current Streak" value={`${data.summary.currentStreak} days`} />
            <SummaryCard title="Workouts Done" value={`${data.summary.workoutsDone}`} />
            <SummaryCard title="Avg Meals Followed" value={`${data.summary.avgMealsPct}%`} />
          </div>

          {/* Trends */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TrendCard title="Last 7 days — Meals Followed (%)">
              <BarTrend
                items={data.logs.slice(0, 7).reverse().map((l) => ({
                  label: l.date.slice(5),
                  value: l.mealsFollowedPct,
                }))}
                max={100}
                suffix="%"
              />
            </TrendCard>

            <TrendCard title="Last 7 days — Mood">
              <MoodTrend
                items={data.logs.slice(0, 7).reverse().map((l) => ({
                  label: l.date.slice(5),
                  emoji: moodEmoji(l.mood),
                }))}
              />
            </TrendCard>
          </div>

          {/* Secondary metrics */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <TrendCard title="Sleep (hrs)">
              <MiniList
                items={data.logs.slice(0, 7).map((l) => ({
                  label: l.date,
                  value: l.sleepHours !== null ? `${l.sleepHours}` : "—",
                }))}
              />
            </TrendCard>

            <TrendCard title="Water (liters)">
              <MiniList
                items={data.logs.slice(0, 7).map((l) => ({
                  label: l.date,
                  value: l.waterLiters !== null ? `${l.waterLiters}` : "—",
                }))}
              />
            </TrendCard>

            <TrendCard title="Weight (kg)">
              <MiniList
                items={data.logs.slice(0, 7).map((l) => ({
                  label: l.date,
                  value: l.weightKg !== null ? `${l.weightKg}` : "—",
                }))}
              />
            </TrendCard>
          </div>
        </>
      )}

      <div className="fixed bottom-6 right-6 grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white shadow-lg">
        ?
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs text-slate-600">{title}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TrendCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BarTrend({
  items,
  max,
  suffix,
}: {
  items: Array<{ label: string; value: number }>;
  max: number;
  suffix: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const pct = Math.max(0, Math.min(100, Math.round((it.value / max) * 100)));
        return (
          <div key={it.label} className="flex items-center gap-3">
            <div className="w-12 text-xs text-slate-500">{it.label}</div>
            <div className="h-3 flex-1 rounded-full bg-slate-100">
              <div className="h-3 rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
            </div>
            <div className="w-12 text-right text-xs font-semibold text-slate-700">
              {it.value}
              {suffix}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MoodTrend({ items }: { items: Array<{ label: string; emoji: string }> }) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {items.map((it) => (
        <div key={it.label} className="text-center">
          <div className="rounded-xl border border-slate-200 bg-slate-50 py-3 text-xl">{it.emoji}</div>
          <p className="mt-1 text-[10px] text-slate-500">{it.label}</p>
        </div>
      ))}
    </div>
  );
}

function MiniList({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-600">{it.label}</p>
          <p className="text-xs font-semibold text-slate-900">{it.value}</p>
        </div>
      ))}
    </div>
  );
}
