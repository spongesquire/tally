import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    app: "Tally",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
}
