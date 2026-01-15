import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Profile } from "@/lib/models/Profile";
import { DailyLog } from "@/lib/models/DailyLog";

type Fail = { ok: false; message: string };

function safeEmail(v: string | null): string {
  return (v ?? "").trim().toLowerCase();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = safeEmail(url.searchParams.get("email"));

  if (!email) {
    return NextResponse.json({ ok: false, message: "Missing email" } satisfies Fail, { status: 400 });
  }

  await connectMongo();

  const user = await User.findOne({ email }).lean();
  const profile = await Profile.findOne({ userEmail: email }).lean();
  const logs = await DailyLog.find({ userEmail: email }).sort({ date: -1 }).lean();

  const payload = {
    exportedAt: new Date().toISOString(),
    account: user
      ? { email: String(user.email), fullName: String(user.fullName) }
      : { email, fullName: email.split("@")[0] },
    profile: profile ?? null,
    dailyLogs: logs ?? [],
  };

  const filename = `routineforge-data-${today()}.json`;

  return new NextResponse(JSON.stringify({ ok: true, data: payload }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
