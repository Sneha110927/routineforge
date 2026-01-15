import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";

type Body = { email?: string; password?: string };
type Ok = { ok: true; user: { email: string; fullName: string } };
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
      return NextResponse.json({ ok: false, message: "Missing email or password" } satisfies Fail, {
        status: 400,
      });
    }

    await connectMongo();

    const user = await User.findOne({ email }).lean();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Invalid email or password" } satisfies Fail, {
        status: 401,
      });
    }

    const incoming = hashPassword(password);
    if (incoming !== user.passwordHash) {
      return NextResponse.json({ ok: false, message: "Invalid email or password" } satisfies Fail, {
        status: 401,
      });
    }

    const resp: Ok = {
      ok: true,
      user: { email: String(user.email), fullName: String(user.fullName) },
    };

    return NextResponse.json(resp);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ ok: false, message: msg } satisfies Fail, { status: 500 });
  }
}
