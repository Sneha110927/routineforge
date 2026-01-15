import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";

type Body = { email?: string };
type Fail = { ok: false; message: string };

function safeEmail(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const email = safeEmail(body.email);

  // Always return ok to avoid leaking if email exists
  if (!email) {
    return NextResponse.json({ ok: true });
  }

  await connectMongo();

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  user.resetPasswordToken = token;
  user.resetPasswordExpiresAt = expiresAt;
  await user.save();

  // Dev-mode: return the link so you can click it
  // In production: email this link
  const resetLink = `/reset-password?token=${encodeURIComponent(token)}`;

  return NextResponse.json({ ok: true, resetLink });
}
