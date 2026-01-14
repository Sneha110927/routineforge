import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { DailyLog } from "@/lib/models/DailyLog";

type LogBody = {
  userEmail?: string;
  routineDone?: boolean;
  workoutDone?: boolean;
  mealsFollowed?: boolean;
  mood?: number;
  notes?: string;
};

function todayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const body: LogBody = await req.json();

  const userEmail = (body.userEmail ?? "").trim();
  if (!userEmail) {
    return NextResponse.json({ ok: false, message: "Missing userEmail" }, { status: 400 });
  }

  const date = todayYYYYMMDD();

  await connectMongo();

  const log = await DailyLog.findOneAndUpdate(
    { userEmail, date },
    {
      $set: {
        userEmail,
        date,
        routineDone: Boolean(body.routineDone),
        workoutDone: Boolean(body.workoutDone),
        mealsFollowed: Boolean(body.mealsFollowed),
        mood: typeof body.mood === "number" ? body.mood : 3,
        notes: typeof body.notes === "string" ? body.notes : "",
      },
    },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ ok: true, log });
}
