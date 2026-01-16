import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!key) {
    return NextResponse.json({ ok: false, message: "Missing GEMINI_API_KEY" }, { status: 500 });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
  );

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
