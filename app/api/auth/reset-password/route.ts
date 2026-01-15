import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";

type Body = { token?: string; password?: string };
type Fail = { ok: false; message: string };

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const token = safeStr(body.token);
  const password = safeStr(body.password);

  if (!token || password.length < 6) {
    return NextResponse.json({ ok: false, message: "Invalid token or password too short" } satisfies Fail, { status: 400 });
  }

  await connectMongo();

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: "Reset link expired or invalid" } satisfies Fail, { status: 400 });
  }

  user.passwordHash = hashPassword(password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiresAt = undefined;

  await user.save();

  return NextResponse.json({ ok: true });
}
