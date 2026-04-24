import { fetchPRs } from "@/lib/github/fetchPRs";
import { classifyPRs } from "@/lib/metrics/classify";
import { computeEnabledPRs } from "@/lib/metrics/multiplier";
import { computeScores } from "@/lib/metrics/score";
import { getWindowStart } from "@/lib/github/client";
import { ScoreDistribution } from "@/components/ScoreDistribution";
import { EngineerTable } from "@/components/EngineerTable";

export const revalidate = 3600;

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function Home() {
  const windowEnd = new Date();
  const windowStart = getWindowStart();

  const raw = await fetchPRs();
  const classified = classifyPRs(raw);
  const enabledMap = computeEnabledPRs(classified);
  const engineers = computeScores(classified, enabledMap);

  const top5 = engineers.slice(0, 5);
  const avg =
    engineers.length > 0
      ? engineers.reduce((s, e) => s + e.impactfulPRs, 0) / engineers.length
      : 0;

  return (
    <main className="min-h-screen bg-gray-100 flex items-start justify-center py-4 px-4">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  PostHog Engineering Impact
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {formatDate(windowStart)} – {formatDate(windowEnd)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Impactful PRs = Effective PRs + Enabled PRs
                </p>
                <p className="text-xs text-gray-300">
                  Quality displayed separately
                </p>
              </div>
            </div>
          </div>

          {/* Dot distribution chart */}
          <div className="border-b border-gray-100">
            <ScoreDistribution
              engineers={engineers}
              top5={top5}
              avgImpactfulPRs={avg}
              totalContributors={engineers.length}
            />
          </div>

          {/* Engineer table */}
          <EngineerTable top5={top5} />

        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Data from{" "}
          <a
            href="https://github.com/PostHog/posthog"
            className="underline hover:text-gray-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            PostHog/posthog
          </a>{" "}
          · Refreshes every hour
        </p>
      </div>
    </main>
  );
}
