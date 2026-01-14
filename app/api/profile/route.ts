import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Profile } from "@/lib/models/Profile";

type ProfileInput = {
  userEmail: string;

  heightCm: string;
  weightKg: string;
  age: string;
  gender: "" | "male" | "female" | "other" | "prefer_not";

  profession: string;
  workStart: string;
  workEnd: string;
  activityLevel: "low" | "medium" | "high";

  dietPreference: "veg" | "nonveg" | "eggetarian" | "vegan";
  allergies: string;
  mealsPerDay: "3" | "4" | "5";

  goal: "muscle_gain" | "weight_gain" | "fat_loss" | "maintenance";
  experience: "beginner" | "intermediate" | "advanced";
  workoutLocation: "home" | "gym";
  workoutMinutesPerDay: string;
};

export async function POST(req: Request) {
  const body: ProfileInput = await req.json();

  if (!body.userEmail) {
    return NextResponse.json({ ok: false, message: "Missing userEmail" }, { status: 400 });
  }

  await connectMongo();

  const saved = await Profile.findOneAndUpdate(
    { userEmail: body.userEmail },
    { $set: body },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true, profile: saved });
}
