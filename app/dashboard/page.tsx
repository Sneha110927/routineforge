"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type RoutineItem = { time: string; title: string; icon: string };
type MealItem = { name: string; desc: string; kcal: number };
type WorkoutItem = {
  title: string;
  subtitle: string;
  durationMin: number;
  items: Array<{ name: string; setsReps: string }>;
};

type PlanResponse =
  | { ok: false; message: string }
  | {
      ok: true;
      userEmail: string;
      greetingName: string;
      currentBlock: { title: string; time: string };
      streakDays: number;
      routine: RoutineItem[];
      meals: MealItem[];
      workout: WorkoutItem;
    };

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function SmallIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
      {children}
    </div>
  );
}
function ActionCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="group block">
      <div
        className={[
          "rounded-2xl border border-slate-200 bg-white shadow-sm",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-1 hover:shadow-md hover:border-emerald-200",
          "active:translate-y-0 active:scale-[0.99]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
        ].join(" ")}
      >
        <div className="p-5">
          <div className="transition-transform duration-200 group-hover:scale-105">
            <SmallIcon>{icon}</SmallIcon>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-900 transition-colors group-hover:text-emerald-700">
            {title}
          </p>
          <p className="mt-2 text-xs text-slate-600">{desc}</p>

          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="transition-colors group-hover:text-emerald-700">
              Open
            </span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TopNav() {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white">
            <span className="text-sm font-bold">◎</span>
          </div>
          <span className="text-lg font-semibold text-slate-900">
            RoutineForge
          </span>
        </div>

        <div className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
          <button className="flex items-center gap-2 hover:text-slate-900">
            🕒 <span className="font-medium">Routine</span>
          </button>
          <button className="flex items-center gap-2 hover:text-slate-900">
            🍽️ <span className="font-medium">Meals</span>
          </button>
          <button className="flex items-center gap-2 hover:text-slate-900">
            🏋️ <span className="font-medium">Workout</span>
          </button>
          <button className="flex items-center gap-2 hover:text-slate-900">
            📈 <span className="font-medium">Reports</span>
          </button>
          <button className="hover:text-slate-900">⚙️</button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  useEffect(() => {
    const email = localStorage.getItem("rf_email") ?? "";
    if (!email) {
      queueMicrotask(() => {
        setData({ ok: false, message: "No login found. Please log in again." });
        setLoading(false);
      });
      return;
    }

    fetch(`/api/plan?email=${encodeURIComponent(email)}`)
      .then(async (r) => (await r.json()) as PlanResponse)
      .then((json) => setData(json))
      .catch(() => setData({ ok: false, message: "Failed to load plan." }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <TopNav />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
            Loading your plan…
          </div>
        ) : data && !data.ok ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {data.message}
          </div>
        ) : data && data.ok ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {greeting}, {data.greetingName}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                <p>Here&#39;s your overview for today</p>
              </p>
            </div>

            {/* Top highlight cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100">
                <div className="flex items-center gap-4 p-5">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white">
                    🕒
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Current Block</p>
                    <p className="font-semibold text-slate-900">
                      {data.currentBlock.title}
                    </p>
                    <p className="text-xs text-slate-600">
                      {data.currentBlock.time}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100">
                <div className="flex items-center gap-4 p-5">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white">
                    🔥
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Current Streak</p>
                    <p className="font-semibold text-slate-900">
                      {data.streakDays} days
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick action cards */}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <ActionCard
                href="/routine"
                icon="🗓️"
                title="Daily Routine"
                desc="View today's schedule"
              />
              <ActionCard
                href="/meals"
                icon="🍽️"
                title="Meal Plan"
                desc="Check your meals"
              />
              <ActionCard
                href="/workout"
                icon="🏋️"
                title="Workout"
                desc="View exercise plan"
              />
              <ActionCard
                href="/tracker"
                icon="✅"
                title="Log Today"
                desc="Track your progress"
              />
            </div>

            {/* 3-column content */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Routine */}
              <Card>
                <div className="flex items-center justify-between p-5">
                  <p className="text-sm font-semibold text-slate-900">
                    Today&apos;s Routine
                  </p>
                  <button className="text-xs font-semibold text-slate-900 hover:underline">
                    View All
                  </button>
                </div>

                <div className="px-5 pb-5">
                  <div className="space-y-4">
                    {data.routine.slice(0, 5).map((r) => (
                      <div
                        key={`${r.time}-${r.title}`}
                        className="flex items-start gap-3"
                      >
                        <div className="mt-0.5 text-lg">{r.icon}</div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {r.title}
                          </p>
                          <p className="text-xs text-slate-500">{r.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Meals */}
              <Card>
                <div className="flex items-center justify-between p-5">
                  <p className="text-sm font-semibold text-slate-900">
                    Today&apos;s Meals
                  </p>
                  <button className="text-xs font-semibold text-slate-900 hover:underline">
                    View All
                  </button>
                </div>

                <div className="px-5 pb-5 space-y-3">
                  {data.meals.map((m) => (
                    <div
                      key={m.name}
                      className="rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">
                          {m.name}
                        </p>
                        <p className="text-xs text-slate-500">{m.kcal} kcal</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Workout */}
              <Card>
                <div className="flex items-center justify-between p-5">
                  <p className="text-sm font-semibold text-slate-900">
                    Today&apos;s Workout
                  </p>
                  <button className="text-xs font-semibold text-slate-900 hover:underline">
                    View All
                  </button>
                </div>

                <div className="px-5 pb-5">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">
                          🏋️ {data.workout.title}
                        </p>
                        <p className="mt-1 text-xs text-emerald-700/80">
                          {data.workout.subtitle}
                        </p>
                      </div>
                      <p className="text-xs text-emerald-700">
                        {data.workout.durationMin}min
                      </p>
                    </div>

                    <div className="mt-3 space-y-2">
                      {data.workout.items.slice(0, 3).map((w) => (
                        <div
                          key={w.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <p className="text-slate-900">{w.name}</p>
                          <p className="text-xs text-slate-600">{w.setsReps}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* CTA bottom */}
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-8 text-center">
              <p className="text-sm font-semibold text-slate-900">
                Ready to start your day?
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Don&apos;t forget to log your progress tonight to keep your
                streak going!
              </p>
              <button className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
                Log Today&apos;s Progress
              </button>
            </div>

            <div className="fixed bottom-6 right-6 grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white shadow-lg">
              ?
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
