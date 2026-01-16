import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

type Body = { message?: string };
type Ok = { ok: true; reply: string };
type Fail = { ok: false; message: string };

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const message = safeStr(body.message);

    if (!message) {
      return NextResponse.json(
        { ok: false, message: "Missing message" } satisfies Fail,
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(mustEnv("GEMINI_API_KEY"));

    // Pick a fast, cheap model for chat. You can change later.
    // See "models" docs for available options.
   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


    const system = [
      "You are RoutineForge AI assistant.",
      "Help users with daily routine planning, meals, workouts, sleep, habit-building.",
      "Keep answers concise, practical, and safe.",
      "Do not claim medical diagnosis. Suggest seeing a professional for medical issues.",
    ].join(" ");

    const result = await model.generateContent([
      { text: system },
      { text: `User: ${message}` },
    ]);

    const reply = result.response.text().trim();

    return NextResponse.json({ ok: true, reply } satisfies Ok);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json(
      { ok: false, message: msg } satisfies Fail,
      { status: 500 }
    );
  }
}
