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
  meals: MealItem[];
  workout: WorkoutItem;
  routineBlocks: RoutineBlock[];
};

type PlanFail = { ok: false; message: string };

/* ===================== TIME HELPERS (INDIA / IST) ===================== */

const IST_OFFSET_MIN = 330; // +05:30

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

// Current IST minutes-of-day
function nowMinIST(): number {
  const now = new Date();
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMin + IST_OFFSET_MIN + 1440) % 1440;
}

// Current IST date "YYYY-MM-DD"
function istYYYYMMDD(d: Date = new Date()): string {
  const utcMs = d.getTime();
  const istMs = utcMs + IST_OFFSET_MIN * 60_000;
  const ist = new Date(istMs);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth() + 1;
  const day = ist.getUTCDate();
  return `${y}-${pad2(m)}-${pad2(day)}`;
}

function prevDayIST(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const utc = Date.UTC(y, (m ?? 1) - 1, d ?? 1); // treat as UTC date
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

/* ===================== MEALS ===================== */

function calories(_diet: DietPref, goal: Goal) {
  const base = goal === "fat_loss" ? 1700 : goal === "maintenance" ? 2000 : 2400;
  return {
    breakfast: Math.round(base * 0.25),
    lunch: Math.round(base * 0.35),
    dinner: Math.round(base * 0.3),
  };
}

function mealTemplates(diet: DietPref, goal: Goal) {
  if (diet !== "nonveg") {
    return goal === "fat_loss"
      ? [
          { name: "Breakfast", desc: "Moong dal chilla + curd / tofu dip" },
          { name: "Lunch", desc: "Dal + salad + 2 rotis (or quinoa) + sabzi" },
          { name: "Dinner", desc: "Paneer/tofu bhurji + veggies + light roti" },
        ]
      : [
          { name: "Breakfast", desc: "Oats + fruits + nuts (add milk/curd or soy milk)" },
          { name: "Lunch", desc: "Rajma/chole + rice + salad + curd (optional)" },
          { name: "Dinner", desc: "Paneer/tofu + veggies + 2 rotis" },
        ];
  }

  return goal === "fat_loss"
    ? [
        { name: "Breakfast", desc: "Egg omelette + fruit" },
        { name: "Lunch", desc: "Grilled chicken/fish + salad + small rice/roti" },
        { name: "Dinner", desc: "Lean chicken + veggies + light roti" },
      ]
    : [
        { name: "Breakfast", desc: "Eggs + oats + fruits" },
        { name: "Lunch", desc: "Chicken + rice + veggies" },
        { name: "Dinner", desc: "Fish/chicken + veggies + roti" },
      ];
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
/** This is only used for the small list cards on dashboard, not for "current block". */
function buildRoutineList(workStart: string, workoutTime: string): RoutineItem[] {
  return [
    { time: toTime(Math.max(6 * 60, toMin(workStart) - 240)), title: "Wake Up & Stretch", icon: "🌅" },
    { time: toTime(Math.max(7 * 60, toMin(workStart) - 180)), title: "Breakfast", icon: "☕" },
    { time: workStart, title: "Work Begins", icon: "💻" },
    { time: workoutTime, title: "Workout", icon: "🏋️" },
    { time: "21:00", title: "Wind Down", icon: "📖" },
  ];
}

/* ===================== ROUTINE BLOCKS (TIMELINE) ===================== */

function pushBlock(arr: RoutineBlock[], start: number, end: number, icon: string, title: string, bullets: string[]) {
  if (end <= start) return;
  arr.push({ start: toTime(start), end: toTime(end), icon, title, bullets });
}

/**
 * Dynamic routine blocks built around user's workStart/workEnd in IST.
 * - Handles early/late shifts
 * - Splits work around lunch in a realistic way
 * - Ensures no invalid overlaps / backwards times
 */
function buildRoutineBlocks(params: { workStart: string; workEnd: string; workoutMinutes: number }): RoutineBlock[] {
  const ws = toMin(params.workStart);
  const we = toMin(params.workEnd);

  // If end < start, assume overnight shift (add 24h to end)
  const weAbs = we < ws ? we + 1440 : we;

  // Lunch around midpoint but clamp to 12:00–14:30 (IST)
  const mid = Math.round((ws + weAbs) / 2);
  const lunchStart = clamp(mid, 12 * 60, 14 * 60 + 30);
  const lunchEnd = lunchStart + 45;

  // Wake up: 2.5h before work, clamp to 05:30–09:00
  const wakeStart = clamp(ws - 150, 5 * 60 + 30, 9 * 60);
  const wakeEnd = wakeStart + 20;

  // Short meditation + prep
  const medStart = wakeEnd;
  const medEnd = medStart + 15;

  // Breakfast: around 60–90 min before work
  const breakfastStart = clamp(ws - 75, medEnd, ws - 30);
  const breakfastEnd = breakfastStart + 25;

  // Work block 1: from work start to lunch-10
  const work1Start = ws;
  const work1End = Math.max(work1Start + 60, lunchStart - 10);

  // Work block 2: from lunchEnd+10 to work end
  const work2Start = Math.min(lunchEnd + 10, weAbs - 20);
  const work2End = weAbs;

  // Snack: right after work
  const snackStart = work2End;
  const snackEnd = snackStart + 25;

  // Workout: 30 min after work, duration based on user
  const wDur = clamp(params.workoutMinutes || 35, 20, 90);
  const workoutStart = work2End + 30;
  const workoutEnd = workoutStart + wDur;

  // Dinner: 45–75 min after workout
  const dinnerStart = workoutEnd + 60;
  const dinnerEnd = dinnerStart + 40;

  // Wind down: 45 min
  const windStart = dinnerEnd + 30;
  const windEnd = windStart + 45;

  // Sleep: fixed 30 min block (bedtime routine)
  const sleepStart = windEnd + 30;
  const sleepEnd = sleepStart + 30;

  const blocks: RoutineBlock[] = [];

  pushBlock(blocks, wakeStart, wakeEnd, "☀️", "Wake Up", ["Hydrate", "Light stretching"]);
  pushBlock(blocks, medStart, medEnd, "🧘", "Morning Meditation", ["Breathing", "Mindfulness"]);
  pushBlock(blocks, breakfastStart, breakfastEnd, "☕", "Breakfast", ["Healthy meal", "Plan day"]);

  // If lunch is before work starts (edge), skip splitting work and do single work block
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

  // Convert any times beyond 24h back to HH:MM display
  // (we already toTime() in pushBlock which wraps mod 1440)
  return blocks;
}

/* ===================== CURRENT BLOCK (FROM TIMELINE IN IST) ===================== */

function currentBlockFromBlocksIST(blocks: RoutineBlock[]): { title: string; time: string } {
  const now = nowMinIST();

  // Find active (including possible overnight shift blocks if any, but we keep in 0..1440 display)
  for (const b of blocks) {
    const s = toMin(b.start);
    const e = toMin(b.end);

    // Handle blocks that wrap midnight (e < s)
    if (e < s) {
      if (now >= s || now < e) return { title: b.title, time: `${b.start} - ${b.end}` };
    } else {
      if (now >= s && now < e) return { title: b.title, time: `${b.start} - ${b.end}` };
    }
  }

  // If no active, pick next upcoming
  let next: RoutineBlock | null = null;
  for (const b of blocks) {
    const s = toMin(b.start);
    const isAfter = s > now;
    if (isAfter && (!next || s < toMin(next.start))) next = b;
  }
  if (next) return { title: next.title, time: `${next.start} - ${next.end}` };

  // else last block of day
  const last = blocks.reduce((a, b) => (toMin(b.start) > toMin(a.start) ? b : a), blocks[0]);
  return { title: last.title, time: `${last.start} - ${last.end}` };
}

/* ===================== STREAK (IST DATE) ===================== */

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
  let day = istYYYYMMDD(); // today in IST

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

  const cals = calories(diet, goal);
  const baseMeals = mealTemplates(diet, goal);

  const meals: MealItem[] = [
    { ...baseMeals[0], kcal: cals.breakfast },
    { ...baseMeals[1], kcal: cals.lunch },
    { ...baseMeals[2], kcal: cals.dinner },
  ];

  const workout = buildWorkout(goal, exp, loc, Number(profile.workoutMinutesPerDay));

  const workStart = String(profile.workStart ?? "10:30");
  const workEnd = String(profile.workEnd ?? "20:00");

  // workout time suggestion: 30 min after workEnd (display in 24h)
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
    currentBlock: currentBlockFromBlocksIST(routineBlocks), // ✅ IST-correct and based on timeline
    streakDays,
    routine,
    meals,
    workout,
    routineBlocks,
  };

  return NextResponse.json(resp);
}
