import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Profile } from "@/lib/models/Profile";

export const runtime = "nodejs";

type Body = { email?: string; password?: string };

type Ok = {
  ok: true;
  user: {
    email: string;
    fullName: string;
    onboardingCompleted: boolean;
  };
};

type Fail = { ok: false; message: string };

function safeEmail(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}
function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const email = safeEmail(body.email);
    const password = safeStr(body.password);

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, message: "Missing email or password" } satisfies Fail,
        { status: 400 }
      );
    }

    await connectMongo();

    const user = await User.findOne({ email }).lean();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Invalid email or password" } satisfies Fail,
        { status: 401 }
      );
    }

    const incoming = hashPassword(password);
    const storedHash = String((user as unknown as { passwordHash?: unknown }).passwordHash ?? "");
    if (incoming !== storedHash) {
      return NextResponse.json(
        { ok: false, message: "Invalid email or password" } satisfies Fail,
        { status: 401 }
      );
    }

    // ✅ THIS IS THE FIX:
    // If a Profile exists for this email, onboarding is completed.
    const hasProfile = await Profile.exists({ userEmail: email });

    const onboardingCompleted =
      Boolean((user as unknown as { onboardingCompleted?: unknown }).onboardingCompleted) || Boolean(hasProfile);

    // ✅ Auto-heal old users: if profile exists but flag is false, set it true
    if (hasProfile) {
      await User.updateOne({ email }, { $set: { onboardingCompleted: true } });
    }

    const resp: Ok = {
      ok: true,
      user: {
        email: String((user as { email: unknown }).email),
        fullName: String((user as { fullName: unknown }).fullName),
        onboardingCompleted,
      },
    };

    return NextResponse.json(resp);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ ok: false, message: msg } satisfies Fail, { status: 500 });
  }
}
