import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Profile } from "@/lib/models/Profile";
import { DailyLog } from "@/lib/models/DailyLog";

export const runtime = "nodejs";

/* ===================== TYPES ===================== */

type DietPref = "veg" | "nonveg" | "eggetarian" | "vegan";
type Goal = "muscle_gain" | "weight_gain" | "fat_loss" | "maintenance";
type Experience = "beginner" | "intermediate" | "advanced";
type Location = "home" | "gym";

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
  meals: MealItem[]; // ✅ will now be 3/4/5 based on profile
  workout: WorkoutItem;
  routineBlocks: RoutineBlock[];
};

type PlanFail = { ok: false; message: string };

/* ===================== TIME HELPERS (INDIA / IST) ===================== */

const IST_OFFSET_MIN = 330;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toMin(t: string): number {
  const parts = t.split(":");
  const h = Number(parts[0] ?? "0");
  const m = Number(parts[1] ?? "0");
  return h * 60 + m;
}

function toTime(m: number): string {
  const mm = ((m % 1440) + 1440) % 1440;
  const hh = Math.floor(mm / 60);
  const min = mm % 60;
  return `${pad2(hh)}:${pad2(min)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function nowMinIST(): number {
  const now = new Date();
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMin + IST_OFFSET_MIN + 1440) % 1440;
}

function istYYYYMMDD(d: Date = new Date()): string {
  const istMs = d.getTime() + IST_OFFSET_MIN * 60_000;
  const ist = new Date(istMs);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth() + 1;
  const day = ist.getUTCDate();
  return `${y}-${pad2(m)}-${pad2(day)}`;
}

function prevDayIST(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const utc = Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  const prev = new Date(utc - 24 * 60 * 60 * 1000);
  const yy = prev.getUTCFullYear();
  const mm = prev.getUTCMonth() + 1;
  const dd = prev.getUTCDate();
  return `${yy}-${pad2(mm)}-${pad2(dd)}`;
}

/* ===================== PARSERS ===================== */

const parseDiet = (v: unknown): DietPref =>
  v === "veg" || v === "nonveg" || v === "eggetarian" || v === "vegan" ? v : "veg";

const parseGoal = (v: unknown): Goal =>
  v === "muscle_gain" || v === "weight_gain" || v === "fat_loss" || v === "maintenance" ? v : "muscle_gain";

const parseExp = (v: unknown): Experience =>
  v === "beginner" || v === "intermediate" || v === "advanced" ? v : "beginner";

const parseLoc = (v: unknown): Location => (v === "home" || v === "gym" ? v : "home");

function parseMealsPerDay(v: unknown): 3 | 4 | 5 {
  const n = Number(v);
  if (n === 3 || n === 4 || n === 5) return n;
  // Profile might store as string "3"/"4"/"5"
  if (v === "3") return 3;
  if (v === "4") return 4;
  if (v === "5") return 5;
  return 3;
}

/* ===================== MEALS ===================== */

/**
 * Total calories baseline (you can refine later).
 * We will distribute across 3/4/5 meals.
 */
function totalCalories(_diet: DietPref, goal: Goal): number {
  const base = goal === "fat_loss" ? 1700 : goal === "maintenance" ? 2000 : 2400;
  return base;
}

/**
 * Build meal templates based on mealsPerDay.
 * - Always returns EXACT count: 3 / 4 / 5
 * - Indian-friendly
 * - Goal-aware
 */
function mealTemplates(diet: DietPref, goal: Goal, mealsPerDay: 3 | 4 | 5): Array<{ name: string; desc: string }> {
  const isVeg = diet !== "nonveg";
  const isLoss = goal === "fat_loss";

  const breakfast = isVeg
    ? isLoss
      ? "Moong dal chilla + curd/tofu dip"
      : "Oats + fruits + nuts (milk/curd/soy)"
    : isLoss
    ? "Egg omelette + fruit"
    : "Eggs + oats + fruit";

  const lunch = isVeg
    ? isLoss
      ? "Dal + salad + 2 rotis (or quinoa) + sabzi"
      : "Rajma/chole + rice + salad + curd (optional)"
    : isLoss
    ? "Grilled chicken/fish + salad + small rice/roti"
    : "Chicken + rice + veggies";

  const dinner = isVeg
    ? isLoss
      ? "Paneer/tofu bhurji + veggies + light roti"
      : "Paneer/tofu + veggies + 2 rotis"
    : isLoss
    ? "Lean chicken + veggies + light roti"
    : "Fish/chicken + veggies + roti";

  const snack1 = isVeg
    ? "Fruit + roasted chana / buttermilk"
    : "Fruit + yogurt / boiled eggs (optional)";

  const snack2 = isVeg
    ? "Sprouts / protein smoothie (low sugar)"
    : "Protein smoothie / nuts (portion controlled)";

  if (mealsPerDay === 3) {
    return [
      { name: "Breakfast", desc: breakfast },
      { name: "Lunch", desc: lunch },
      { name: "Dinner", desc: dinner },
    ];
  }

  if (mealsPerDay === 4) {
    return [
      { name: "Breakfast", desc: breakfast },
      { name: "Lunch", desc: lunch },
      { name: "Evening Snack", desc: snack1 },
      { name: "Dinner", desc: dinner },
    ];
  }

  // 5 meals
  return [
    { name: "Breakfast", desc: breakfast },
    { name: "Mid-morning Snack", desc: snack1 },
    { name: "Lunch", desc: lunch },
    { name: "Evening Snack", desc: snack2 },
    { name: "Dinner", desc: dinner },
  ];
}

/**
 * Distribute calories across meal count.
 * Returns kcal per meal in same order as templates.
 */
function distributeCalories(total: number, mealsPerDay: 3 | 4 | 5): number[] {
  // Simple, realistic splits:
  // 3 meals: 25% / 40% / 35%
  // 4 meals: 25% / 35% / 15% / 25%
  // 5 meals: 22% / 10% / 35% / 13% / 20%
  const w =
    mealsPerDay === 3
      ? [0.25, 0.4, 0.35]
      : mealsPerDay === 4
      ? [0.25, 0.35, 0.15, 0.25]
      : [0.22, 0.1, 0.35, 0.13, 0.2];

  const raw = w.map((x) => Math.round(total * x));
  // Fix rounding drift
  const drift = total - raw.reduce((a, b) => a + b, 0);
  raw[raw.length - 1] = raw[raw.length - 1] + drift;
  return raw;
}

/* ===================== WORKOUT ===================== */

function buildWorkout(goal: Goal, exp: Experience, loc: Location, mins: number): WorkoutItem {
  const duration = clamp(Number.isFinite(mins) ? mins : 35, 20, 90);
  const level = exp === "beginner" ? "Beginner" : exp === "intermediate" ? "Intermediate" : "Advanced";

  const items =
    goal === "fat_loss"
      ? [
          { name: "Jumping jacks", setsReps: "3 × 45s" },
          { name: "Squats", setsReps: "3 × 12" },
          { name: "Push-ups", setsReps: exp === "beginner" ? "3 × 8" : "3 × 12" },
          { name: "Plank", setsReps: "3 × 45s" },
        ]
      : [
          { name: "Push-ups", setsReps: exp === "beginner" ? "3 × 8" : "3 × 12" },
          { name: "Rows", setsReps: "3 × 10" },
          { name: "Squats", setsReps: "3 × 12" },
          { name: "Overhead press", setsReps: "3 × 10" },
        ];

  return {
    title: loc === "gym" ? "Gym Workout" : "Home Workout",
    subtitle: `${goal.replace("_", " ")} • ${level}`,
    durationMin: duration,
    items,
  };
}

/* ===================== ROUTINE LIST (DASHBOARD) ===================== */

function buildRoutineList(workStart: string, workoutTime: string): RoutineItem[] {
  return [
    { time: toTime(Math.max(6 * 60, toMin(workStart) - 240)), title: "Wake Up & Stretch", icon: "🌅" },
    { time: toTime(Math.max(7 * 60, toMin(workStart) - 180)), title: "Breakfast", icon: "☕" },
    { time: workStart, title: "Work Begins", icon: "💻" },
    { time: workoutTime, title: "Workout", icon: "🏋️" },
    { time: "21:00", title: "Wind Down", icon: "📖" },
  ];
}

/* ===================== ROUTINE BLOCKS ===================== */

function pushBlock(arr: RoutineBlock[], start: number, end: number, icon: string, title: string, bullets: string[]) {
  if (end <= start) return;
  arr.push({ start: toTime(start), end: toTime(end), icon, title, bullets });
}

function buildRoutineBlocks(params: { workStart: string; workEnd: string; workoutMinutes: number }): RoutineBlock[] {
  const ws = toMin(params.workStart);
  const we = toMin(params.workEnd);
  const weAbs = we < ws ? we + 1440 : we;

  const mid = Math.round((ws + weAbs) / 2);
  const lunchStart = clamp(mid, 12 * 60, 14 * 60 + 30);
  const lunchEnd = lunchStart + 45;

  const wakeStart = clamp(ws - 150, 5 * 60 + 30, 9 * 60);
  const wakeEnd = wakeStart + 20;

  const medStart = wakeEnd;
  const medEnd = medStart + 15;

  const breakfastStart = clamp(ws - 75, medEnd, ws - 30);
  const breakfastEnd = breakfastStart + 25;

  const work1Start = ws;
  const work1End = Math.max(work1Start + 60, lunchStart - 10);

  const work2Start = Math.min(lunchEnd + 10, weAbs - 20);
  const work2End = weAbs;

  const snackStart = work2End;
  const snackEnd = snackStart + 25;

  const wDur = clamp(params.workoutMinutes || 35, 20, 90);
  const workoutStart = work2End + 30;
  const workoutEnd = workoutStart + wDur;

  const dinnerStart = workoutEnd + 60;
  const dinnerEnd = dinnerStart + 40;

  const windStart = dinnerEnd + 30;
  const windEnd = windStart + 45;

  const sleepStart = windEnd + 30;
  const sleepEnd = sleepStart + 30;

  const blocks: RoutineBlock[] = [];

  pushBlock(blocks, wakeStart, wakeEnd, "☀️", "Wake Up", ["Hydrate", "Light stretching"]);
  pushBlock(blocks, medStart, medEnd, "🧘", "Morning Meditation", ["Breathing", "Mindfulness"]);
  pushBlock(blocks, breakfastStart, breakfastEnd, "☕", "Breakfast", ["Healthy meal", "Plan day"]);

  if (lunchStart <= ws) {
    pushBlock(blocks, ws, weAbs, "💼", "Work Block", ["Focus", "Deep work"]);
  } else {
    pushBlock(blocks, work1Start, work1End, "💼", "Morning Work Block", ["Deep work", "Focus"]);
    pushBlock(blocks, lunchStart, lunchEnd, "🍽️", "Lunch Break", ["Balanced meal", "Short walk"]);
    pushBlock(blocks, work2Start, work2End, "🧳", "Afternoon Work Block", ["Meetings", "Wrap up"]);
  }

  pushBlock(blocks, snackStart, snackEnd, "🍵", "Evening Snack", ["Hydrate", "Light snack"]);
  pushBlock(blocks, workoutStart, workoutEnd, "🏋️", "Workout", [`${wDur} min training`, "Stretch"]);
  pushBlock(blocks, dinnerStart, dinnerEnd, "🍲", "Dinner", ["Light dinner", "Relax"]);
  pushBlock(blocks, windStart, windEnd, "📖", "Wind Down", ["Screen-free time", "Relaxation"]);
  pushBlock(blocks, sleepStart, sleepEnd, "🛏️", "Sleep", ["Wind down", "7–8 hrs sleep"]);

  return blocks;
}

/* ===================== CURRENT BLOCK ===================== */

function currentBlockFromBlocksIST(blocks: RoutineBlock[]): { title: string; time: string } {
  const now = nowMinIST();

  for (const b of blocks) {
    const s = toMin(b.start);
    const e = toMin(b.end);

    if (e < s) {
      if (now >= s || now < e) return { title: b.title, time: `${b.start} - ${b.end}` };
    } else {
      if (now >= s && now < e) return { title: b.title, time: `${b.start} - ${b.end}` };
    }
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

/* ===================== STREAK (IST) ===================== */

async function computeStreakDaysIST(userEmail: string): Promise<number> {
  const logs = await DailyLog.find({ userEmail })
    .select({ date: 1, _id: 0 })
    .sort({ date: -1 })
    .limit(90)
    .lean();

  const set = new Set<string>();
  for (const l of logs) {
    const d = typeof l.date === "string" ? l.date : "";
    if (d) set.add(d);
  }

  let streak = 0;
  let day = istYYYYMMDD();

  while (set.has(day)) {
    streak++;
    day = prevDayIST(day);
  }

  return streak;
}

/* ===================== ROUTE ===================== */

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email") ?? "";

  if (!email) {
    return NextResponse.json({ ok: false, message: "Missing email" } satisfies PlanFail, { status: 400 });
  }

  await connectMongo();

  const profile = await Profile.findOne({ userEmail: email }).lean();
  if (!profile) {
    return NextResponse.json(
      { ok: false, message: "Profile not found. Complete onboarding." } satisfies PlanFail,
      { status: 404 }
    );
  }

  const diet = parseDiet(profile.dietPreference);
  const goal = parseGoal(profile.goal);
  const exp = parseExp(profile.experience);
  const loc = parseLoc(profile.workoutLocation);

  const mealsPerDay = parseMealsPerDay(profile.mealsPerDay);

  const total = totalCalories(diet, goal);
  const templates = mealTemplates(diet, goal, mealsPerDay);
  const kcalParts = distributeCalories(total, mealsPerDay);

  const meals: MealItem[] = templates.map((t, idx) => ({
    name: t.name,
    desc: t.desc,
    kcal: kcalParts[idx] ?? Math.round(total / mealsPerDay),
  }));

  const workout = buildWorkout(goal, exp, loc, Number(profile.workoutMinutesPerDay));

  const workStart = String(profile.workStart ?? "10:30");
  const workEnd = String(profile.workEnd ?? "20:00");

  const workoutTime = toTime(toMin(workEnd) + 30);

  const routineBlocks = buildRoutineBlocks({
    workStart,
    workEnd,
    workoutMinutes: Number(profile.workoutMinutesPerDay),
  });

  const routine = buildRoutineList(workStart, workoutTime);
  const streakDays = await computeStreakDaysIST(email);

  const resp: PlanOk = {
    ok: true,
    userEmail: email,
    greetingName: email.split("@")[0],
    currentBlock: currentBlockFromBlocksIST(routineBlocks),
    streakDays,
    routine,
    meals,
    workout,
    routineBlocks,
  };

  return NextResponse.json(resp);
}
