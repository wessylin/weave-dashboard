// Run with: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/verify-m4.ts
import { fetchPRs } from "../lib/github/fetchPRs";
import { classifyPRs } from "../lib/metrics/classify";
import { computeEnabledPRs } from "../lib/metrics/multiplier";
import { computeScores } from "../lib/metrics/score";

async function main() {
  console.log("Fetching and classifying PRs...");
  const raw = await fetchPRs();
  const prs = classifyPRs(raw);

  console.log("Computing enabled PRs...");
  const enabledMap = await computeEnabledPRs(prs);

  const all = computeScores(prs, enabledMap);
  const top5 = all.slice(0, 5);

  console.log("\n=== TOP 5 ENGINEERS (last 90 days) ===\n");
  for (let i = 0; i < top5.length; i++) {
    const e = top5[i];
    console.log(`#${i + 1} ${e.login}`);
    console.log(`  Impactful PRs: ${e.impactfulPRs}`);
    console.log(`  Effective PRs: ${e.effectivePRs}`);
    console.log(`  Enabled PRs:   ${e.enabledPRs}`);
    console.log(`  Ineffective:   ${e.ineffectivePRs}`);
    console.log(`  Quality Rate:  ${Math.round(e.qualityRate * 100)}%`);
    console.log();
  }

  console.log(`Full ranking covers ${all.length} engineers.`);
}

main().catch(console.error);
