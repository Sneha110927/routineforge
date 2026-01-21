import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false, message: "Missing email" }, { status: 400 });

  await connectMongo();
  const user = await User.findOne({ email }).lean();
  return NextResponse.json({ ok: true, onboardingCompleted: Boolean(user?.onboardingCompleted) });
}
