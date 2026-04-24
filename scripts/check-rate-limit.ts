import { octokit } from "../lib/github/client";

async function main() {
  const { data } = await octokit.rateLimit.get();
  const core = data.resources.core;
  const pct = Math.round((core.remaining / core.limit) * 100);
  const resets = new Date(core.reset * 1000).toLocaleTimeString();

  console.log("GitHub API Rate Limit");
  console.log("---------------------");
  console.log(`Limit:      ${core.limit}`);
  console.log(`Used:       ${core.used}`);
  console.log(`Remaining:  ${core.remaining} (${pct}%)`);
  console.log(`Resets at:  ${resets}`);

  if (core.remaining < 500) {
    console.log("\nWARNING: Fewer than 500 requests remaining.");
    console.log("M3 reference resolution may hit the limit. Wait until", resets);
  }
}

main().catch(console.error);
