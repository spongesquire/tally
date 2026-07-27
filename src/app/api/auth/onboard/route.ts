import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDeviceProfile, setSessionCookie } from "@/server/auth/session";

const OnboardSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(50, "Name is too long"),
  colourKey: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = OnboardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { userId, token } = await createDeviceProfile(
      parsed.data.displayName,
      parsed.data.colourKey
    );

    await setSessionCookie(token);

    return NextResponse.json({ ok: true, userId });
  } catch (err) {
    console.error("[onboard] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
