import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import crypto from "crypto";

type LoginBody = {
  email: string;
  password: string;
};

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: Request) {
  const body: LoginBody = await req.json();

  if (!body.email || !body.password) {
    return NextResponse.json({ ok: false, message: "Missing fields" }, { status: 400 });
  }

  await connectMongo();

  const user = await User.findOne({ email: body.email }).lean();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
  }

  const incomingHash = hashPassword(body.password);
  if (incomingHash !== user.passwordHash) {
    return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
  }

  // simple “session” for now: frontend stores rf_email
  return NextResponse.json({
    ok: true,
    user: { email: user.email, fullName: user.fullName },
  });
}
