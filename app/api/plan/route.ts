import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Profile } from "@/lib/models/Profile";
import { DailyLog } from "@/lib/models/DailyLog";
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
  currentBlock: { title: string; time: string }; // keep, but we'll override on UI
  streakDays: number;
  routine?: RoutineItem[];
  meals?: MealItem[];
  workout?: WorkoutItem;
  routineBlocks?: RoutineBlock[]; // ✅ add this
};


type PlanFail = { ok: false; message: string };

/* ===================== TIME HELPERS ===================== */

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function toTime(m: number): string {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function utcYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function prevDayUTC(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return utcYYYYMMDD(dt);
}

/* ===================== PARSERS ===================== */

const parseDiet = (v: unknown): DietPref =>
  v === "veg" || v === "nonveg" || v === "eggetarian" || v === "vegan" ? v : "veg";

const parseGoal = (v: unknown): Goal =>
  v === "muscle_gain" || v === "weight_gain" || v === "fat_loss" || v === "maintenance"
    ? v
    : "muscle_gain";

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
        { name: "Lunch", desc: "Grilled chicken + salad" },
        { name: "Dinner", desc: "Lean chicken + veggies" },
      ]
    : [
        { name: "Breakfast", desc: "Eggs + oats + fruits" },
        { name: "Lunch", desc: "Chicken + rice" },
        { name: "Dinner", desc: "Fish/chicken + roti" },
      ];
}

/* ===================== WORKOUT ===================== */

function buildWorkout(goal: Goal, exp: Experience, loc: Location, mins: number): WorkoutItem {
  const duration = clamp(mins || 35, 20, 90);
  const level = exp === "beginner" ? "Beginner" : exp === "intermediate" ? "Intermediate" : "Advanced";

  const items =
    goal === "fat_loss"
      ? [
          { name: "Jumping jacks", setsReps: "3 × 45s" },
          { name: "Squats", setsReps: "3 × 12" },
          { name: "Push-ups", setsReps: "3 × 10" },
          { name: "Plank", setsReps: "3 × 45s" },
        ]
      : [
          { name: "Push-ups", setsReps: "3 × 10" },
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

/* ===================== ROUTINE LIST (TOP DASH) ===================== */

function buildRoutineList(workStart: string, workoutTime: string): RoutineItem[] {
  return [
    { time: "06:30", title: "Wake Up & Stretch", icon: "🌅" },
    { time: "07:30", title: "Breakfast", icon: "☕" },
    { time: workStart, title: "Work Begins", icon: "💻" },
    { time: workoutTime, title: "Workout", icon: "🏋️" },
    { time: "21:00", title: "Wind Down", icon: "📖" },
  ];
}

/* ===================== CURRENT BLOCK FROM TIMELINE ===================== */

function currentBlockFromBlocks(blocks: RoutineBlock[]): { title: string; time: string } {
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();

  for (const b of blocks) {
    const s = toMin(b.start);
    const e = toMin(b.end);
    if (nowM >= s && nowM < e) {
      return { title: b.title, time: `${b.start} - ${b.end}` };
    }
  }

  let last = blocks[0];
  for (const b of blocks) {
    if (toMin(b.start) <= nowM) last = b;
  }
  return { title: last.title, time: `${last.start} - ${last.end}` };
}

/* ===================== ROUTINE BLOCKS (TIMELINE) ===================== */

function buildRoutineBlocks(params: {
  workStart: string;
  workEnd: string;
  workoutMinutes: number;
}): RoutineBlock[] {
  const ws = toMin(params.workStart);
  const we = toMin(params.workEnd);

  const wake = clamp(ws - 240, 330, 510);
  const wakeEnd = wake + 30;

  const meditationStart = wakeEnd;
  const meditationEnd = meditationStart + 20;

  const breakfastStart = meditationEnd;
  const breakfastEnd = breakfastStart + 30;

  const lunchStart = clamp(Math.round((ws + we) / 2), 12 * 60, 14 * 60);
  const lunchEnd = lunchStart + 45;

  const work1Start = ws;
  const work1End = Math.max(work1Start + 60, lunchStart - 10);

  const work2Start = Math.min(lunchEnd + 10, we - 30);
  const work2End = we;

  const snackStart = we;
  const snackEnd = snackStart + 25;

  const wDur = clamp(params.workoutMinutes || 35, 20, 90);
  const workoutStart = we + 30;
  const workoutEnd = workoutStart + wDur;

  const dinnerStart = workoutEnd + 60;
  const dinnerEnd = dinnerStart + 45;

  const windDownStart = clamp(dinnerEnd + 30, 20 * 60 + 30, 22 * 60 + 30);
  const windDownEnd = windDownStart + 45;

  const sleepStart = clamp(windDownEnd + 30, 22 * 60 + 30, 23 * 60 + 30);
  const sleepEnd = sleepStart + 30;

  const blocks: RoutineBlock[] = [];
  const push = (s: number, e: number, icon: string, title: string, bullets: string[]) => {
    if (e <= s) return;
    blocks.push({ start: toTime(s), end: toTime(e), icon, title, bullets });
  };

  push(wake, wakeEnd, "☀️", "Wake Up", ["Hydrate", "Light stretching"]);
  push(meditationStart, meditationEnd, "🧘", "Morning Meditation", ["Breathing", "Mindfulness"]);
  push(breakfastStart, breakfastEnd, "☕", "Breakfast", ["Healthy meal", "Plan day"]);
  push(work1Start, work1End, "💼", "Morning Work Block", ["Deep work", "Focus"]);
  push(lunchStart, lunchEnd, "🍽️", "Lunch Break", ["Balanced meal", "Walk"]);
  push(work2Start, work2End, "🧳", "Afternoon Work Block", ["Meetings", "Wrap up"]);
  push(snackStart, snackEnd, "🍵", "Evening Snack", ["Light snack", "Hydrate"]);
  push(workoutStart, workoutEnd, "🏋️", "Workout", [`${wDur} min training`, "Stretch"]);
  push(dinnerStart, dinnerEnd, "🍲", "Dinner", ["Light dinner", "Relax"]);
  push(windDownStart, windDownEnd, "📖", "Wind Down", ["Screen-free time", "Relaxation"]);
  push(sleepStart, sleepEnd, "🛏️", "Sleep", ["Wind down", "7–8 hrs sleep"]);

  return blocks;
}

/* ===================== STREAK ===================== */

async function computeStreakDays(userEmail: string): Promise<number> {
  // last 60 logs is enough for streak calculation
  const logs = await DailyLog.find({ userEmail })
    .select({ date: 1, _id: 0 })
    .sort({ date: -1 })
    .limit(60)
    .lean();

  const set = new Set<string>();
  for (const l of logs) {
    const d = typeof l.date === "string" ? l.date : "";
    if (d) set.add(d);
  }

  let streak = 0;
  let day = utcYYYYMMDD(new Date());

  while (set.has(day)) {
    streak++;
    day = prevDayUTC(day);
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
  const workoutTime = toTime(toMin(workEnd) + 30);

  const routineBlocks = buildRoutineBlocks({
    workStart,
    workEnd,
    workoutMinutes: Number(profile.workoutMinutesPerDay),
  });

  const routine = buildRoutineList(workStart, workoutTime);

  const streakDays = await computeStreakDays(email);

  const resp: PlanOk = {
    ok: true,
    userEmail: email,
    greetingName: email.split("@")[0],
    currentBlock: currentBlockFromBlocks(routineBlocks),
    streakDays,
    routine,
    meals,
    workout,
    routineBlocks,
  };

  return NextResponse.json(resp);
}
