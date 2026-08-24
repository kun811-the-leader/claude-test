import { NextRequest, NextResponse } from "next/server";
import { tickScheduler } from "@/lib/scheduler";

/**
 * Production entry point for the scheduler (spec §25). Point an external
 * cron at this with `Authorization: Bearer $SCHEDULER_SECRET`. Not open —
 * without a matching secret this always 401s, so nothing on the internet
 * can trigger your agents' recurring runs.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SCHEDULER_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await tickScheduler();
  return NextResponse.json(result);
}
