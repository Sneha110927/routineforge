import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Profile } from "@/lib/models/Profile";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";

type InBody = Record<string, unknown>;

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InBody;

    const userEmail = s(body.userEmail).toLowerCase();
    if (!userEmail) {
      return NextResponse.json({ ok: false, message: "Missing userEmail" }, { status: 400 });
    }

    const update = {
      userEmail,

      heightCm: s(body.heightCm),
      weightKg: s(body.weightKg),
      age: s(body.age),
      gender: s(body.gender),

      profession: s(body.profession),
      workStart: s(body.workStart),
      workEnd: s(body.workEnd),
      activityLevel: s(body.activityLevel),

      dietPreference: s(body.dietPreference),
      allergies: s(body.allergies),
      mealsPerDay: s(body.mealsPerDay),

      goal: s(body.goal),
      experience: s(body.experience),
      workoutLocation: s(body.workoutLocation),
      workoutMinutesPerDay: s(body.workoutMinutesPerDay),
      prefDarkMode: Boolean(body.prefDarkMode),
      prefDailyReminder: body.prefDailyReminder === undefined ? true : Boolean(body.prefDailyReminder),
      prefWorkoutReminder: body.prefWorkoutReminder === undefined ? true : Boolean(body.prefWorkoutReminder),
      prefMealReminder: body.prefMealReminder === undefined ? true : Boolean(body.prefMealReminder),
    };
    if (!update.heightCm || !update.weightKg || !update.age) {
      return NextResponse.json({ ok: false, message: "Missing required profile fields" }, { status: 400 });
    }

    await connectMongo();

    await Profile.findOneAndUpdate(
      { userEmail },
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    await User.updateOne(
      { email: userEmail },
      { $set: { onboardingCompleted: true } }
    );

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to save profile";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
