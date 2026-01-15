import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Profile } from "@/lib/models/Profile";
import { DailyLog } from "@/lib/models/DailyLog";

type DeleteBody = { email?: string };
type Fail = { ok: false; message: string };

function safeEmail(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

export async function POST(req: Request) {
  const body = (await req.json()) as DeleteBody;
  const email = safeEmail(body.email);

  if (!email) {
    return NextResponse.json({ ok: false, message: "Missing email" } satisfies Fail, { status: 400 });
  }

  await connectMongo();

  await DailyLog.deleteMany({ userEmail: email });
  await Profile.deleteOne({ userEmail: email });
  await User.deleteOne({ email });

  return NextResponse.json({ ok: true });
}
