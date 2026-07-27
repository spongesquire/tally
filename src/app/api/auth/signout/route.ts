import { NextResponse } from "next/server";
import { getSession, signOut } from "@/server/auth/session";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: true });
  }
  await signOut();
  return NextResponse.json({ ok: true });
}
