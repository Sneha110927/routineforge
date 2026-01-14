import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import crypto from "crypto";

type SignupBody = {
  fullName: string;
  email: string;
  password: string;
};

function hashPassword(password: string): string {
  // simple SHA256 for now (upgrade later to bcrypt)
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: Request) {
  const body: SignupBody = await req.json();

  if (!body.fullName || !body.email || !body.password) {
    return NextResponse.json({ ok: false, message: "Missing fields" }, { status: 400 });
  }

  await connectMongo();

  const existing = await User.findOne({ email: body.email });
  if (existing) {
    return NextResponse.json({ ok: false, message: "Email already exists" }, { status: 409 });
  }

  const created = await User.create({
    fullName: body.fullName,
    email: body.email,
    passwordHash: hashPassword(body.password),
  });

  return NextResponse.json({ ok: true, user: { email: created.email, fullName: created.fullName } });
}
