import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { DailyLog } from "@/lib/models/DailyLog";

export const runtime = "nodejs";

type Mood = 1 | 2 | 3 | 4 | 5;

type LogPayload = {
  userEmail: string;
  date: string; // YYYY-MM-DD (IST)

  weightKg: number | null;
  waterLiters: number | null;
  sleepHours: number | null;
  steps: number | null;

  workoutDone: boolean;
  mealsFollowedPct: number; // 0..100
  mood: Mood;
  notes: string;
};

type Fail = { ok: false; message: string };

const IST_OFFSET_MIN = 330;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function istYYYYMMDD(d: Date = new Date()): string {
  const istMs = d.getTime() + IST_OFFSET_MIN * 60_000;
  const ist = new Date(istMs);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth() + 1;
  const day = ist.getUTCDate();
  return `${y}-${pad2(m)}-${pad2(day)}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isMood(v: number): v is Mood {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5;
}

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const date = (url.searchParams.get("date") ?? "").trim();

  if (!email || !date) {
    return NextResponse.json({ ok: false, message: "Missing email or date" } satisfies Fail, { status: 400 });
  }

  await connectMongo();

  const log = await DailyLog.findOne({ userEmail: email, date }).lean();
  return NextResponse.json({ ok: true, log: log ?? null });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<LogPayload> & {
    // allow older boolean field from your old UI if it ever calls this route
    mealsFollowed?: unknown; // boolean
    mealsFollowedPct?: unknown; // number
  };

  const userEmail =
    typeof body.userEmail === "string" ? body.userEmail.trim().toLowerCase() : "";

  if (!userEmail) {
    return NextResponse.json({ ok: false, message: "Missing userEmail" } satisfies Fail, { status: 400 });
  }

  const date =
    typeof body.date === "string" && body.date.trim() ? body.date.trim() : istYYYYMMDD();

  const mealsPctRaw =
    body.mealsFollowedPct !== undefined
      ? Number(body.mealsFollowedPct)
      : typeof body.mealsFollowed === "boolean"
      ? body.mealsFollowed
        ? 100
        : 0
      : 0;

  const mealsFollowedPct = clamp(Number.isFinite(mealsPctRaw) ? mealsPctRaw : 0, 0, 100);

  const moodNum = Number(body.mood ?? 3);
  const mood: Mood = isMood(moodNum) ? moodNum : 3;

  await connectMongo();

  const update: LogPayload = {
    userEmail,
    date,

    weightKg: toNumOrNull(body.weightKg),
    waterLiters: toNumOrNull(body.waterLiters),
    sleepHours: toNumOrNull(body.sleepHours),
    steps: toNumOrNull(body.steps),

    workoutDone: Boolean(body.workoutDone),
    mealsFollowedPct,
    mood,
    notes: typeof body.notes === "string" ? body.notes : "",
  };

  const saved = await DailyLog.findOneAndUpdate(
    { userEmail: update.userEmail, date: update.date },
    { $set: update },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ ok: true, log: saved });
}
