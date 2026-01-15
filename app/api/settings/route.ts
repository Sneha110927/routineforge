import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Profile } from "@/lib/models/Profile";
import { User } from "@/lib/models/User";

type DietPref = "veg" | "nonveg" | "eggetarian" | "vegan";
type Goal = "muscle_gain" | "weight_gain" | "fat_loss" | "maintenance";
type Location = "home" | "gym";
type Experience = "beginner" | "intermediate" | "advanced";

type SettingsGetOk = {
  ok: true;
  account: { name: string; email: string };
  profile: {
    weightKg: string;
    heightCm: string;
    goal: Goal;
    dietPreference: DietPref;
    workoutLocation: Location;
    workoutMinutesPerDay: string;
    experience: Experience;
  };
  preferences: {
    darkMode: boolean;
    dailyReminder: boolean;
    workoutReminder: boolean;
    mealReminder: boolean;
  };
};

type SettingsFail = { ok: false; message: string };

function parseDiet(v: unknown): DietPref {
  if (v === "veg" || v === "nonveg" || v === "eggetarian" || v === "vegan") return v;
  return "veg";
}
function parseGoal(v: unknown): Goal {
  if (v === "muscle_gain" || v === "weight_gain" || v === "fat_loss" || v === "maintenance") return v;
  return "muscle_gain";
}
function parseLoc(v: unknown): Location {
  if (v === "home" || v === "gym") return v;
  return "home";
}
function parseExp(v: unknown): Experience {
  if (v === "beginner" || v === "intermediate" || v === "advanced") return v;
  return "beginner";
}
function parseBool(v: unknown, def: boolean): boolean {
  return typeof v === "boolean" ? v : def;
}
function str(v: unknown, def: string): string {
  const s = typeof v === "string" ? v : "";
  return s.trim() ? s : def;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim();
  if (!email) {
    return NextResponse.json({ ok: false, message: "Missing email" } satisfies SettingsFail, { status: 400 });
  }

  await connectMongo();

  const user = await User.findOne({ email }).lean();
  const profile = await Profile.findOne({ userEmail: email }).lean();

  const name = user?.fullName ? String(user.fullName) : email.split("@")[0];

  const resp: SettingsGetOk = {
    ok: true,
    account: { name, email },
    profile: {
      weightKg: str(profile?.weightKg, ""),
      heightCm: str(profile?.heightCm, ""),
      goal: parseGoal(profile?.goal),
      dietPreference: parseDiet(profile?.dietPreference),
      workoutLocation: parseLoc(profile?.workoutLocation),
      workoutMinutesPerDay: str(profile?.workoutMinutesPerDay, "30"),
      experience: parseExp(profile?.experience),
    },
    preferences: {
      darkMode: parseBool(profile?.prefDarkMode, false),
      dailyReminder: parseBool(profile?.prefDailyReminder, true),
      workoutReminder: parseBool(profile?.prefWorkoutReminder, true),
      mealReminder: parseBool(profile?.prefMealReminder, true),
    },
  };

  return NextResponse.json(resp);
}

type SettingsUpdateBody = {
  email?: string;

  // profile
  weightKg?: string;
  heightCm?: string;
  goal?: Goal;
  dietPreference?: DietPref;
  workoutLocation?: Location;
  workoutMinutesPerDay?: string;
  experience?: Experience;

  // preferences
  darkMode?: boolean;
  dailyReminder?: boolean;
  workoutReminder?: boolean;
  mealReminder?: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json()) as SettingsUpdateBody;
  const email = (body.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ ok: false, message: "Missing email" } satisfies SettingsFail, { status: 400 });
  }

  await connectMongo();

  const update: Record<string, unknown> = {
    userEmail: email,
    weightKg: typeof body.weightKg === "string" ? body.weightKg : undefined,
    heightCm: typeof body.heightCm === "string" ? body.heightCm : undefined,
    goal: typeof body.goal === "string" ? body.goal : undefined,
    dietPreference: typeof body.dietPreference === "string" ? body.dietPreference : undefined,
    workoutLocation: typeof body.workoutLocation === "string" ? body.workoutLocation : undefined,
    workoutMinutesPerDay: typeof body.workoutMinutesPerDay === "string" ? body.workoutMinutesPerDay : undefined,
    experience: typeof body.experience === "string" ? body.experience : undefined,

    prefDarkMode: typeof body.darkMode === "boolean" ? body.darkMode : undefined,
    prefDailyReminder: typeof body.dailyReminder === "boolean" ? body.dailyReminder : undefined,
    prefWorkoutReminder: typeof body.workoutReminder === "boolean" ? body.workoutReminder : undefined,
    prefMealReminder: typeof body.mealReminder === "boolean" ? body.mealReminder : undefined,
  };

  // remove undefined
  for (const k of Object.keys(update)) {
    if (update[k] === undefined) delete update[k];
  }

  const saved = await Profile.findOneAndUpdate(
    { userEmail: email },
    { $set: update },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ ok: true, profile: saved });
}
