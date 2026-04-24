// Run with: npx tsx scripts/verify-m1.ts
import { fetchPRs } from "../lib/github/fetchPRs";

async function main() {
  console.log("Fetching PRs from PostHog/posthog (last 90 days)...\n");
  const prs = await fetchPRs();

  console.log(`Total PRs fetched: ${prs.length}`);

  const merged = prs.filter((p) => p.merged).length;
  const closed = prs.filter((p) => !p.merged && p.state === "closed").length;
  const open = prs.filter((p) => p.state === "open").length;

  console.log(`  Merged:  ${merged}`);
  console.log(`  Closed (not merged): ${closed}`);
  console.log(`  Still open: ${open}`);

  const authorCounts: Record<string, number> = {};
  for (const pr of prs) {
    authorCounts[pr.author] = (authorCounts[pr.author] ?? 0) + 1;
  }
  const topAuthors = Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log("\nTop 10 authors by PR count:");
  for (const [login, count] of topAuthors) {
    console.log(`  ${login}: ${count}`);
  }

  console.log("\nSample PR:");
  console.log(JSON.stringify(prs[0], null, 2));
}

main().catch(console.error);
