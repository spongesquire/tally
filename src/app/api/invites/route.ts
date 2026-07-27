import { NextRequest, NextResponse } from "next/server";
import { createInvite } from "@/server/actions/invites";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { groupSlug, inviteType, targetMemberId } = body as {
    groupSlug: string;
    inviteType: "general" | "claim_member" | "readonly";
    targetMemberId?: string;
  };

  if (!groupSlug || !inviteType) {
    return NextResponse.json({ ok: false, error: "Missing parameters" }, { status: 400 });
  }

  const result = await createInvite({ groupSlug, inviteType, targetMemberId });
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
