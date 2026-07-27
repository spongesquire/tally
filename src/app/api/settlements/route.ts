import { NextRequest, NextResponse } from "next/server";
import { saveSettlementAction } from "@/server/actions/settlements";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    groupSlug,
    clientMutationId,
    fromMemberId,
    toMemberId,
    amountMinor,
    settledOn,
    note,
  } = body as {
    groupSlug: string;
    clientMutationId: string;
    fromMemberId: string;
    toMemberId: string;
    amountMinor: number;
    settledOn?: string;
    note?: string;
  };

  if (!groupSlug || !clientMutationId || !fromMemberId || !toMemberId) {
    return NextResponse.json(
      { ok: false, error: "Missing parameters" },
      { status: 400 }
    );
  }

  const result = await saveSettlementAction({
    groupSlug,
    clientMutationId,
    fromMemberId,
    toMemberId,
    amountMinor,
    settledOn,
    note,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
