import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { DailyLog } from "@/lib/models/DailyLog";

type Mood = 1 | 2 | 3 | 4 | 5;

type LogDoc = {
  userEmail: string;
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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isMood(v: number): v is Mood {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5;
}

function toMood(v: unknown): Mood {
  const n = Number(v);
  return isMood(n) ? n : 3;
}

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function todayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10);
}

function minusDaysYYYYMMDD(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function computeStreak(datesDesc: string[]): number {
  // datesDesc = sorted desc ["2026-01-15", "2026-01-14", ...]
  if (datesDesc.length === 0) return 0;

  const today = todayYYYYMMDD();
  const yesterday = minusDaysYYYYMMDD(1);

  // Streak can start today or yesterday
  const start = datesDesc[0] === today ? today : datesDesc[0] === yesterday ? yesterday : "";
  if (!start) return 0;

  let streak = 1;
  for (let i = 1; i < datesDesc.length; i++) {
    const prev = datesDesc[i - 1];
    const expected = (() => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();

    if (datesDesc[i] === expected) streak += 1;
    else break;
  }
  return streak;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim();

  if (!email) {
    return NextResponse.json({ ok: false, message: "Missing email" } satisfies ReportsFail, { status: 400 });
  }

  // default last 30 days
  const daysParam = Number(url.searchParams.get("days") ?? "30");
  const days = clamp(Number.isFinite(daysParam) ? daysParam : 30, 7, 90);

  await connectMongo();

  const fromDate = minusDaysYYYYMMDD(days - 1);

  const raw = await DailyLog.find({
    userEmail: email,
    date: { $gte: fromDate },
  })
    .sort({ date: -1 })
    .lean();

  const logs: LogDoc[] = raw.map((x) => ({
    userEmail: String(x.userEmail ?? ""),
    date: String(x.date ?? ""),
    weightKg: toNumOrNull(x.weightKg),
    waterLiters: toNumOrNull(x.waterLiters),
    sleepHours: toNumOrNull(x.sleepHours),
    steps: toNumOrNull(x.steps),
    workoutDone: Boolean(x.workoutDone),
    mealsFollowedPct: clamp(Number(x.mealsFollowedPct ?? 0), 0, 100),
    mood: toMood(x.mood),
    notes: String(x.notes ?? ""),
  }));

  if (logs.length === 0) {
    const empty: ReportsOk = {
      ok: true,
      logs: [],
      summary: {
        daysLogged: 0,
        currentStreak: 0,
        workoutsDone: 0,
        avgMealsPct: 0,
        avgSleep: null,
        avgWater: null,
        latestWeight: null,
      },
    };
    return NextResponse.json(empty);
  }

  const daysLogged = logs.length;
  const workoutsDone = logs.filter((l) => l.workoutDone).length;
  const avgMealsPct = Math.round(logs.reduce((a, l) => a + l.mealsFollowedPct, 0) / logs.length);

  const sleepVals = logs.map((l) => l.sleepHours).filter((v): v is number => typeof v === "number");
  const avgSleep = sleepVals.length ? Math.round((sleepVals.reduce((a, v) => a + v, 0) / sleepVals.length) * 10) / 10 : null;

  const waterVals = logs.map((l) => l.waterLiters).filter((v): v is number => typeof v === "number");
  const avgWater = waterVals.length ? Math.round((waterVals.reduce((a, v) => a + v, 0) / waterVals.length) * 10) / 10 : null;

  const latestWeight = logs.find((l) => typeof l.weightKg === "number")?.weightKg ?? null;

  const datesDesc = logs.map((l) => l.date);
  const currentStreak = computeStreak(datesDesc);

  const resp: ReportsOk = {
    ok: true,
    logs,
    summary: {
      daysLogged,
      currentStreak,
      workoutsDone,
      avgMealsPct,
      avgSleep,
      avgWater,
      latestWeight,
    },
  };

  return NextResponse.json(resp);
}
