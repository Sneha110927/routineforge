import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Profile } from "@/lib/models/Profile";

// -------- Types (strict) --------
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

type RoutineBlock = {
  start: string;
  end: string;
  icon: string;
  title: string;
  bullets: string[];
};

type PlanOk = {
  ok: true;
  userEmail: string;
  greetingName: string;
  currentBlock: { title: string; time: string };
  streakDays: number;

  // Dashboard uses these
  routine: RoutineItem[];
  meals: MealItem[];
  workout: WorkoutItem;

  // Routine timeline uses this
  routineBlocks: RoutineBlock[];
};

type PlanFail = { ok: false; message: string };
type PlanResponse = PlanOk | PlanFail;

// -------- Helpers --------
function parseTimeToMinutes(t: string): number {
  const [hh, mm] = t.split(":").map((x) => Number(x));
  return hh * 60 + mm;
}

function minutesToTime(m: number): string {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function addMinutes(time: string, mins: number): string {
  const base = parseTimeToMinutes(time);
  return minutesToTime(base + mins);
}

function greetingForNow(): "Good morning" | "Good afternoon" | "Good evening" {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function parseDietPref(v: unknown): DietPref {
  if (v === "veg" || v === "nonveg" || v === "eggetarian" || v === "vegan") return v;
  return "veg";
}

function parseGoal(v: unknown): Goal {
  if (v === "muscle_gain" || v === "weight_gain" || v === "fat_loss" || v === "maintenance") return v;
  return "muscle_gain";
}

function parseExperience(v: unknown): Experience {
  if (v === "beginner" || v === "intermediate" || v === "advanced") return v;
  return "beginner";
}

function parseLocation(v: unknown): Location {
  if (v === "home" || v === "gym") return v;
  return "home";
}

function calcCalories(diet: DietPref, goal: Goal): { breakfast: number; lunch: number; dinner: number } {
  const base = goal === "fat_loss" ? 1700 : goal === "maintenance" ? 2000 : 2400;
  const adjust = diet === "vegan" ? -50 : 0;
  const total = base + adjust;
  return {
    breakfast: Math.round(total * 0.25),
    lunch: Math.round(total * 0.35),
    dinner: Math.round(total * 0.3),
  };
}

function pickMeals(diet: DietPref, goal: Goal): Array<{ name: string; desc: string }> {
  if (diet === "veg" || diet === "eggetarian" || diet === "vegan") {
    if (goal === "fat_loss") {
      return [
        { name: "Breakfast", desc: "Moong dal chilla + curd / tofu dip" },
        { name: "Lunch", desc: "Dal + salad + 2 rotis (or quinoa) + sabzi" },
        { name: "Dinner", desc: "Paneer/tofu bhurji + veggies + light roti" },
      ];
    }
    return [
      { name: "Breakfast", desc: "Oats + fruits + nuts (add milk/curd or soy milk)" },
      { name: "Lunch", desc: "Rajma/chole + rice + salad + curd (optional)" },
      { name: "Dinner", desc: "Paneer/tofu + veggies + 2 rotis" },
    ];
  }

  if (goal === "fat_loss") {
    return [
      { name: "Breakfast", desc: "Egg omelette + fruit" },
      { name: "Lunch", desc: "Grilled chicken/fish + salad + small rice/roti" },
      { name: "Dinner", desc: "Chicken curry (lean) + veggies + light roti" },
    ];
  }
  return [
    { name: "Breakfast", desc: "Oats + fruits + nuts + eggs" },
    { name: "Lunch", desc: "Grilled chicken + rice + veggies" },
    { name: "Dinner", desc: "Fish/chicken + veggies + roti" },
  ];
}

function pickWorkout(goal: Goal, exp: Experience, loc: Location, minutes: number): WorkoutItem {
  const durationMin = Math.max(20, Math.min(90, Number.isFinite(minutes) ? minutes : 35));
  const level = exp === "beginner" ? "Beginner" : exp === "intermediate" ? "Intermediate" : "Advanced";
  const place = loc === "gym" ? "Gym Workout" : "Home Workout";

  const baseItems =
    goal === "fat_loss"
      ? [
          { name: "Jumping jacks", setsReps: "3 × 45s" },
          { name: "Bodyweight squats", setsReps: "3 × 12" },
          { name: "Push-ups", setsReps: exp === "beginner" ? "3 × 8" : "3 × 12" },
          { name: "Plank", setsReps: "3 × 45s" },
        ]
      : [
          { name: "Push-ups", setsReps: exp === "beginner" ? "3 × 8" : "3 × 12" },
          { name: "Rows (band/dumbbell)", setsReps: "3 × 10" },
          { name: "Squats", setsReps: "3 × 12" },
          { name: "Overhead press", setsReps: "3 × 10" },
        ];

  return {
    title: place,
    subtitle: goal === "fat_loss" ? `Fat loss focus • ${level}` : `Strength focus • ${level}`,
    durationMin,
    items: baseItems,
  };
}

function buildRoutineList(workStart: string, workEnd: string, workoutTime: string): RoutineItem[] {
  const ws = parseTimeToMinutes(workStart);
  const we = parseTimeToMinutes(workEnd);

  const wake = 7 * 60;
  const breakfast = 8 * 60;
  const workBlock = Math.max(ws - 90, 9 * 60);
  const lunch = Math.round((ws + we) / 2) - 30;
  const workout = parseTimeToMinutes(workoutTime);

  return [
    { time: minutesToTime(wake), title: "Wake Up & Stretch", icon: "🌅" },
    { time: minutesToTime(breakfast), title: "Breakfast", icon: "☕" },
    { time: minutesToTime(workBlock), title: "Work Block", icon: "💻" },
    { time: minutesToTime(lunch), title: "Lunch Break", icon: "🍽️" },
    { time: minutesToTime(workout), title: "Evening Workout", icon: "🏋️" },
  ];
}

function currentBlockFromRoutine(routine: RoutineItem[]): { title: string; time: string } {
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();

  let best: RoutineItem | null = null;
  for (const item of routine) {
    const m = parseTimeToMinutes(item.time);
    if (m <= nowM) best = item;
  }
  if (!best) return { title: routine[0]?.title ?? "Start your day", time: routine[0]?.time ?? "07:00" };
  return { title: best.title, time: best.time };
}

function buildRoutineBlocks(params: {
  workStart: string;
  workEnd: string;
  goal: Goal;
  diet: DietPref;
  workoutMinutes: number;
}): RoutineBlock[] {
  const wake = "06:00";
  const breakfast = "07:00";
  const ws = params.workStart;

  // make lunch around midpoint of work hours but keep it realistic
  const wsM = parseTimeToMinutes(params.workStart);
  const weM = parseTimeToMinutes(params.workEnd);
  const mid = Math.round((wsM + weM) / 2);
  const lunchStart = minutesToTime(Math.max(12 * 60, mid - 30));
  const lunchEnd = addMinutes(lunchStart, 60);

  const snackStart = params.workEnd;
  const snackEnd = addMinutes(snackStart, 30);

  const workoutStart = addMinutes(params.workEnd, 30);
  const duration = Math.max(20, Math.min(90, Number.isFinite(params.workoutMinutes) ? params.workoutMinutes : 35));
  const workoutEnd = addMinutes(workoutStart, duration);

  const dinnerStart = addMinutes(workoutEnd, 60);
  const dinnerEnd = addMinutes(dinnerStart, 45);

  const windDownStart = "21:00";
  const windDownEnd = "22:00";

  const sleepStart = "23:00";
  const sleepEnd = "23:30";

  const isFatLoss = params.goal === "fat_loss";
  const isVeg = params.diet !== "nonveg";

  return [
    {
      start: wake,
      end: "06:30",
      icon: "☀️",
      title: "Wake Up & Morning Routine",
      bullets: ["Wake up", "Drink water", "Light stretching"],
    },
    {
      start: "06:30",
      end: "07:00",
      icon: "🧘",
      title: "Morning Meditation",
      bullets: ["10 min meditation", "Deep breathing", "Set daily intentions"],
    },
    {
      start: breakfast,
      end: "07:30",
      icon: "☕",
      title: "Breakfast",
      bullets: [
        isVeg ? "Oats / poha / upma + protein" : "Eggs + oats / fruit",
        "Vitamins (optional)",
        "Plan the day",
      ],
    },
    {
      start: ws,
      end: addMinutes(ws, 180),
      icon: "💼",
      title: "Morning Work Block",
      bullets: ["Focus work", "Deep work tasks", "Avoid distractions"],
    },
    {
      start: lunchStart,
      end: lunchEnd,
      icon: "🍽️",
      title: "Lunch Break",
      bullets: [isFatLoss ? "Light healthy lunch" : "Balanced lunch", "Short walk", "Rest & recharge"],
    },
    {
      start: lunchEnd,
      end: params.workEnd,
      icon: "🧳",
      title: "Afternoon Work Block",
      bullets: ["Meetings", "Collaboration", "Task completion"],
    },
    {
      start: snackStart,
      end: snackEnd,
      icon: "🍵",
      title: "Evening Snack",
      bullets: ["Light snack", "Hydrate", "Prepare for workout"],
    },
    {
      start: workoutStart,
      end: workoutEnd,
      icon: "🏋️",
      title: "Evening Workout",
      bullets: [`${duration} min workout`, "Stretch", "Cool down"],
    },
    {
      start: dinnerStart,
      end: dinnerEnd,
      icon: "🍲",
      title: "Dinner",
      bullets: [
        isVeg ? "Dal + roti + veggies" : "Lean protein + veggies",
        "Light conversation",
        "Avoid heavy food late",
      ],
    },
    {
      start: windDownStart,
      end: windDownEnd,
      icon: "📖",
      title: "Wind Down",
      bullets: ["Reading", "Relaxation", "Screen-free time"],
    },
    {
      start: sleepStart,
      end: sleepEnd,
      icon: "🛏️",
      title: "Sleep",
      bullets: ["7-8 hours sleep", "Dark room", "Comfortable temperature"],
    },
  ];
}

// -------- Route --------
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";

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

  const diet = parseDietPref(profile.dietPreference);
  const goal = parseGoal(profile.goal);
  const exp = parseExperience(profile.experience);
  const loc = parseLocation(profile.workoutLocation);

  const calories = calcCalories(diet, goal);

  const mealBase = pickMeals(diet, goal);
  const meals: MealItem[] = [
    { name: mealBase[0].name, desc: mealBase[0].desc, kcal: calories.breakfast },
    { name: mealBase[1].name, desc: mealBase[1].desc, kcal: calories.lunch },
    { name: mealBase[2].name, desc: mealBase[2].desc, kcal: calories.dinner },
  ];

  const workEndMin = parseTimeToMinutes(String(profile.workEnd ?? "20:00"));
  const workoutTime = minutesToTime(Math.min(workEndMin + 30, 21 * 60));

  const routine = buildRoutineList(String(profile.workStart ?? "10:30"), String(profile.workEnd ?? "20:00"), workoutTime);
  const currentBlock = currentBlockFromRoutine(routine);

  const workout = pickWorkout(goal, exp, loc, Number(profile.workoutMinutesPerDay));

  const routineBlocks = buildRoutineBlocks({
    workStart: String(profile.workStart ?? "10:30"),
    workEnd: String(profile.workEnd ?? "20:00"),
    goal,
    diet,
    workoutMinutes: Number(profile.workoutMinutesPerDay),
  });

  const resp: PlanOk = {
    ok: true,
    userEmail: email,
    greetingName: email.split("@")[0],
    currentBlock,
    streakDays: 0,
    routine,
    meals,
    workout,
    routineBlocks,
  };

  return NextResponse.json(resp);
}
