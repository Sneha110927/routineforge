import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";

type Body = { token?: string; password?: string };
type Ok = { ok: true };
type Fail = { ok: false; message: string };

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const token = safeStr(body.token);
    const password = safeStr(body.password);

    if (!token || password.length < 6) {
      return NextResponse.json(
        { ok: false, message: "Invalid token or password too short" } satisfies Fail,
        { status: 400 }
      );
    }

    await connectMongo();

    // ✅ Step 1: check token exists (helps diagnose DB mismatch / token not saved)
    const userByToken = await User.findOne({ resetPasswordToken: token });

    if (!userByToken) {
      return NextResponse.json(
        {
          ok: false,
          message: "Token not found. Use the latest reset email link or check DB connection.",
        } satisfies Fail,
        { status: 400 }
      );
    }

    // ✅ Step 2: check expiry separately (helps diagnose expiry problems)
    const exp = userByToken.resetPasswordExpiresAt;
    if (!exp || exp.getTime() <= Date.now()) {
      return NextResponse.json(
        { ok: false, message: "Reset link expired. Please request a new link." } satisfies Fail,
        { status: 400 }
      );
    }

    // ✅ Update password + clear token
    userByToken.passwordHash = hashPassword(password);
    userByToken.resetPasswordToken = undefined;
    userByToken.resetPasswordExpiresAt = undefined;

    await userByToken.save();

    return NextResponse.json({ ok: true } satisfies Ok);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Reset failed";
    return NextResponse.json({ ok: false, message: msg } satisfies Fail, { status: 500 });
  }
}
