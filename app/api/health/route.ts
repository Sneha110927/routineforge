import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  await connectMongo();
  return NextResponse.json({
    ok: true,
    host: mongoose.connection.host,
    db: mongoose.connection.name,
    readyState: mongoose.connection.readyState,
  });
}
