// Run with: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/verify-m2.ts
import { fetchPRs } from "../lib/github/fetchPRs";
import { classifyPRs } from "../lib/metrics/classify";
import { findRevertedPRNumbers } from "../lib/metrics/reverts";

async function main() {
  console.log("Fetching PRs...\n");
  const raw = await fetchPRs();
  const prs = classifyPRs(raw);

  const effective = prs.filter((p) => p.status === "effective");
  const ineffective = prs.filter((p) => p.status === "ineffective");
  const open = prs.filter((p) => p.status === "open");
  const reverted = findRevertedPRNumbers(raw);

  console.log(`Total PRs:    ${prs.length}`);
  console.log(`Effective:    ${effective.length}`);
  console.log(`Ineffective:  ${ineffective.length}`);
  console.log(`  Open (excluded from score): ${open.length}`);
  console.log(`  Reverted PRs detected: ${reverted.size}`);

  if (reverted.size > 0) {
    console.log("\nReverted PR numbers:", [...reverted].join(", "));
    // Show the revert PRs for spot-checking
    const revertPRs = prs.filter(
      (p) => p.merged && p.title.startsWith('Revert "')
    );
    console.log("\nRevert PRs found:");
    for (const pr of revertPRs.slice(0, 5)) {
      console.log(`  #${pr.number} by ${pr.author}: "${pr.title}"`);
    }
  }

  // Per-author breakdown
  const authors = new Map<string, { effective: number; ineffective: number }>();
  for (const pr of prs) {
    if (pr.status === "open") continue;
    if (!authors.has(pr.author)) {
      authors.set(pr.author, { effective: 0, ineffective: 0 });
    }
    const entry = authors.get(pr.author)!;
    if (pr.status === "effective") entry.effective++;
    else entry.ineffective++;
  }

  const sorted = [...authors.entries()]
    .sort((a, b) => b[1].effective - a[1].effective)
    .slice(0, 10);

  console.log("\nTop 10 authors (effective PRs):");
  for (const [login, counts] of sorted) {
    const total = counts.effective + counts.ineffective;
    const rate = total > 0 ? Math.round((counts.effective / total) * 100) : 0;
    console.log(
      `  ${login}: ${counts.effective} effective, ${counts.ineffective} ineffective (${rate}% quality)`
    );
  }
}

main().catch(console.error);
