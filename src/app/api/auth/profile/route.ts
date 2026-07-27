import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, updateDeviceProfile } from "@/server/auth/session";

const UpdateSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  colourKey: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  await updateDeviceProfile(session.userId, parsed.data);
  return NextResponse.json({ ok: true });
}
