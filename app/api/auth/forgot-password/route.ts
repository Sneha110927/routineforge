import { NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";

type Body = { email?: string };
type Fail = { ok: false; message: string };

function safeEmail(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const email = safeEmail(body.email);

  // Always ok (don’t reveal)
  if (!email) return NextResponse.json({ ok: true });

  try {
    await connectMongo();

    const user = await User.findOne({ email });
    if (!user) return NextResponse.json({ ok: true });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const appUrl = mustEnv("APP_URL").replace(/\/+$/, "");
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const resend = new Resend(mustEnv("RESEND_API_KEY"));
    await resend.emails.send({
      from: mustEnv("RESEND_FROM"),
      to: [email],
      subject: "Reset your RoutineForge password",
      html: `<p>Reset your password:</p><p><a href="${resetUrl}">Reset Password</a></p><p>This link expires in 15 minutes.</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to send reset email";
    return NextResponse.json({ ok: false, message: msg } satisfies Fail, { status: 500 });
  }
}
