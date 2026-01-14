"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type MealItem = { name: string; desc: string; kcal: number };

type PlanResponse =
  | { ok: false; message: string }
  | { ok: true; meals: MealItem[] };

type ViewState =
  | { status: "noauth" }
  | { status: "loading"; email: string }
  | { status: "error"; message: string }
  | { status: "ready"; meals: MealItem[] };

function readEmail(): string {
  return localStorage.getItem("rf_email") ?? "";
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

function MealCard({ meal }: { meal: MealItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-emerald-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{meal.name}</p>
          <p className="mt-2 text-sm text-slate-600">{meal.desc}</p>
        </div>

        <div className="shrink-0 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {meal.kcal} kcal
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-900">Suggestions</p>
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          <li className="flex gap-2">
            <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
            <span>Drink water before the meal</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
            <span>Add a protein portion if possible</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
            <span>Keep portions consistent for 2 weeks</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function MealsPage() {
  const initial = useMemo<ViewState>(() => {
    const email = readEmail();
    return email ? { status: "loading", email } : { status: "noauth" };
  }, []);

  const [view, setView] = useState<ViewState>(initial);

  useEffect(() => {
    if (view.status !== "loading") return;

    const email = view.email;
    let alive = true;

    (async () => {
      try {
        const res = await fetch(`/api/plan?email=${encodeURIComponent(email)}`);
        const json = (await res.json()) as PlanResponse;

        if (!alive) return;

        if (!res.ok || !json.ok) {
          const msg = "message" in json ? json.message : "Failed to load meals.";
          setView({ status: "error", message: msg });
          return;
        }

        setView({ status: "ready", meals: json.meals });
      } catch {
        if (!alive) return;
        setView({ status: "error", message: "Failed to load meals." });
      }
    })();

    return () => {
      alive = false;
    };
  }, [view]);

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
            Loading meals…
          </div>
        ) : view.status === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {view.message}
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Your Meal Plan</h1>
              <p className="mt-2 text-sm text-slate-600">
                Personalized meals based on your preferences and goal
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {view.meals.map((m) => (
                <MealCard key={m.name} meal={m} />
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-8 text-center">
              <p className="text-sm font-semibold text-slate-900">Tip</p>
              <p className="mt-2 text-sm text-slate-600">
                Consistency beats perfection. Follow this plan for 10–14 days, then we can regenerate with better accuracy.
              </p>
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
