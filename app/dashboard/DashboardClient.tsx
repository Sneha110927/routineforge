"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  UtensilsCrossed,
  Dumbbell,
  LineChart,
  Settings,
  CheckCircle2,
  Clock3,
  Flame,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/lib/useTheme";

type RoutineItem = { time: string; title: string; icon: string };
type MealItem = { name: string; desc: string; kcal: number };
type WorkoutItem = {
  title: string;
  subtitle: string;
  durationMin: number;
  items: Array<{ name: string; setsReps: string }>;
};

type RoutineBlock = { start: string; end: string; icon: string; title: string; bullets: string[] };

type PlanOk = {
  ok: true;
  userEmail: string;
  greetingName: string;
  currentBlock: { title: string; time: string };
  streakDays: number;
  routine: RoutineItem[];
  meals: MealItem[];
  workout: WorkoutItem;
  routineBlocks: RoutineBlock[];
};

type PlanFail = { ok: false; message: string };
type PlanResponse = PlanOk | PlanFail;

// Utility functions for time
function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function toTime(m: number): string {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function nowMinutesLocal(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// Calculate current block from routine blocks
function currentBlockFromBlocksLocal(blocks: RoutineBlock[]): { title: string; time: string } {
  const now = nowMinutesLocal();
  for (const b of blocks) {
    const s = toMin(b.start);
    const e = toMin(b.end);
    if (now >= s && now < e) return { title: b.title, time: `${b.start} - ${b.end}` };
  }

  let next: RoutineBlock | null = null;
  for (const b of blocks) {
    const s = toMin(b.start);
    if (s > now && (!next || s < toMin(next.start))) next = b;
  }
  if (next) return { title: next.title, time: `${next.start} - ${next.end}` };

  const last = blocks.reduce((a, b) => (toMin(b.start) > toMin(a.start) ? b : a), blocks[0]);
  return { title: last.title, time: `${last.start} - ${last.end}` };
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={["rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900", className ?? ""].join(" ")}>
      {children}
    </div>
  );
}

function SmallIcon({ children }: { children: React.ReactNode }) {
  return <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">{children}</div>;
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
          "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-1 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-900/40",
          "active:translate-y-0 active:scale-[0.99]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
        ].join(" ")}
      >
        <div className="p-5">
          <div className="transition-transform duration-200 group-hover:scale-105">
            <SmallIcon>{icon}</SmallIcon>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-slate-50 dark:group-hover:text-emerald-300">
            {title}
          </p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{desc}</p>

          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
              Open
            </span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function NavItem({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900",
      ].join(" ")}
    >
      <Icon size={16} className={active ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300"} />
      <span>{label}</span>
    </Link>
  );
}

function TopNav({
  theme,
  onToggleTheme,
  mounted,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  mounted: boolean;
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white">
            <span className="text-sm font-bold">◎</span>
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">RoutineForge</span>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <NavItem href="/routine" label="Routine" Icon={Calendar} />
          <NavItem href="/meals" label="Meals" Icon={UtensilsCrossed} />
          <NavItem href="/workout" label="Workout" Icon={Dumbbell} />
          <NavItem href="/reports" label="Reports" Icon={LineChart} />

          <button
            type="button"
            onClick={onToggleTheme}
            className="ml-1 grid h-9 w-9 place-items-center rounded-xl text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <Moon size={16} />}
          </button>

          <Link
            href="/settings"
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function RecipeFinderBanner() {
  return (
    <Link
      href="/recipe-finder"
      className="mt-6 block rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-5 dark:border-emerald-900/40 dark:from-emerald-900/20 dark:to-emerald-900/10"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-white">👨‍🍳</div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Recipe Finder</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Have ingredients at home? Discover healthy and delicious recipes you can make right now!
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-semibold text-white">
          Find Recipes
        </div>
      </div>
    </Link>
  );
}

export default function DashboardClient() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Only ONE theme source
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

    (async () => {
      try {
        const res = await fetch(`/api/plan?email=${encodeURIComponent(email)}`);
        const text = await res.text();

        let json: PlanResponse;
        try {
          json = text ? (JSON.parse(text) as PlanResponse) : { ok: false, message: "Empty response" };
        } catch {
          json = { ok: false, message: "Invalid server response" };
        }

        setData(json);
      } catch {
        setData({ ok: false, message: "Failed to load plan." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <TopNav theme={theme} onToggleTheme={toggleTheme} mounted={mounted} />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            Loading your plan…
          </div>
        ) : data && !data.ok ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {data.message}
          </div>
        ) : data && data.ok ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight">{greeting}, {data.greetingName}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Here&#39;s your overview for today
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10">
                <div className="flex items-center gap-4 p-5">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white">
                    <Clock3 size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Current Block</p>
                    <p className="font-semibold">{data.currentBlock.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{data.currentBlock.time}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10">
                <div className="flex items-center gap-4 p-5">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white">
                    <Flame size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Current Streak</p>
                    <p className="font-semibold">{data.streakDays} days</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <ActionCard href="/routine" icon={<Calendar size={18} />} title="Daily Routine" desc="View today&#39;s schedule" />
              <ActionCard href="/meals" icon={<UtensilsCrossed size={18} />} title="Meal Plan" desc="Check your meals" />
              <ActionCard href="/workout" icon={<Dumbbell size={18} />} title="Workout" desc="View exercise plan" />
              <ActionCard href="/tracker" icon={<CheckCircle2 size={18} />} title="Log Today" desc="Track your progress" />
            </div>

            <RecipeFinderBanner />

            {/* 3-column content */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Routine */}
              <Card>
                <div className="flex items-center justify-between p-5">
                  <p className="text-sm font-semibold text-slate-900">Today&apos;s Routine</p>
                  <Link href="/routine" className="text-xs font-semibold text-slate-900 hover:underline">
                    View All
                  </Link>
                </div>

                <div className="px-5 pb-5">
                  <div className="space-y-4">
                    {data.routine.slice(0, 5).map((r) => (
                      <div key={`${r.time}-${r.title}`} className="flex items-start gap-3">
                        <div className="mt-0.5 text-lg">{r.icon}</div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{r.title}</p>
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
                  <p className="text-sm font-semibold text-slate-900">Today&apos;s Meals</p>
                  <Link href="/meals" className="text-xs font-semibold text-slate-900 hover:underline">
                    View All
                  </Link>
                </div>

                <div className="px-5 pb-5 space-y-3">
                  {data.meals.map((m) => (
                    <div key={m.name} className="rounded-xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">{m.name}</p>
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
                  <p className="text-sm font-semibold text-slate-900">Today&apos;s Workout</p>
                  <Link href="/workout" className="text-xs font-semibold text-slate-900 hover:underline">
                    View All
                  </Link>
                </div>

                <div className="px-5 pb-5">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">🏋️ {data.workout.title}</p>
                        <p className="mt-1 text-xs text-emerald-700/80">{data.workout.subtitle}</p>
                      </div>
                      <p className="text-xs text-emerald-700">{data.workout.durationMin}min</p>
                    </div>

                    <div className="mt-3 space-y-2">
                      {data.workout.items.slice(0, 3).map((w) => (
                        <div key={w.name} className="flex items-center justify-between text-sm">
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
              <p className="text-sm font-semibold text-slate-900">Ready to start your day?</p>
              <p className="mt-2 text-sm text-slate-600">
                Don&apos;t forget to log your progress tonight to keep your streak going!
              </p>
              <Link
                href="/tracker"
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Log Today&apos;s Progress
              </Link>
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
