// Run with: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/verify-m3.ts
import { fetchPRs } from "../lib/github/fetchPRs";
import { classifyPRs } from "../lib/metrics/classify";
import { computeEnabledPRs } from "../lib/metrics/multiplier";
import { getCacheSize } from "../lib/github/resolveRef";

async function main() {
  console.log("Fetching and classifying PRs...\n");
  const raw = await fetchPRs();
  const prs = classifyPRs(raw);

  console.log("Computing enabled PRs (resolving #number references)...");
  console.log("This may take a few minutes due to API calls.\n");

  const enabledMap = await computeEnabledPRs(prs);

  console.log(`Resolved ${getCacheSize()} unique #number references via API`);
  console.log(`Engineers with enabled PRs: ${enabledMap.size}\n`);

  // Sort by enabled PR count
  const sorted = [...enabledMap.entries()]
    .map(([author, entries]) => ({ author, count: entries.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  console.log("Top 10 engineers by enabled PRs:");
  for (const { author, count } of sorted) {
    console.log(`  ${author}: ${count} enabled`);
  }

  // Show sample entries for spot-checking
  if (sorted.length > 0) {
    const top = sorted[0];
    const entries = enabledMap.get(top.author)!.slice(0, 3);
    console.log(`\nSample enabled PRs for ${top.author}:`);
    for (const e of entries) {
      console.log(
        `  PR #${e.referencingPRNumber} by ${e.referencingPRAuthor} references PR #${e.referencedPRNumber} (merged ${e.mergedAt.slice(0, 10)})`
      );
    }
  }
}

main().catch(console.error);
