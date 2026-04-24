import { NextResponse } from "next/server";
import { fetchPRs } from "@/lib/github/fetchPRs";
import { classifyPRs } from "@/lib/metrics/classify";
import { computeEnabledPRs } from "@/lib/metrics/multiplier";
import { computeScores } from "@/lib/metrics/score";
import { getWindowStart, WINDOW_DAYS } from "@/lib/github/client";
import type { LeaderboardResponse } from "@/lib/types";

export const revalidate = 3600;

export async function GET() {
  try {
    const windowEnd = new Date();
    const windowStart = getWindowStart();

    const raw = await fetchPRs();
    const classified = classifyPRs(raw);
    const enabledMap = computeEnabledPRs(classified);
    const engineers = computeScores(classified, enabledMap);

    const avg =
      engineers.length > 0
        ? engineers.reduce((s, e) => s + e.impactfulPRs, 0) / engineers.length
        : 0;

    const response: LeaderboardResponse = {
      engineers,
      top5: engineers.slice(0, 5),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      totalContributors: engineers.length,
      avgImpactfulPRs: avg,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Leaderboard error:", err);
    return NextResponse.json(
      { error: "Failed to compute leaderboard" },
      { status: 500 }
    );
  }
}

// Suppress unused import warning — WINDOW_DAYS used for ISR alignment
void WINDOW_DAYS;
