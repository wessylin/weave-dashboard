import { octokit, REPO_OWNER, REPO_NAME, getWindowStart, isBot } from "./client";
import type { RawPR } from "../types";

// Pages fetched simultaneously per batch. GitHub allows 5,000 req/hr so 10 concurrent is safe.
const CONCURRENT_PAGES = 10;

export async function fetchPRs(): Promise<RawPR[]> {
  const since = getWindowStart().toISOString();
  const results: RawPR[] = [];
  let startPage = 1;

  while (true) {
    const pageNumbers = Array.from({ length: CONCURRENT_PAGES }, (_, i) => startPage + i);

    const batched = await Promise.all(
      pageNumbers.map((page) =>
        octokit.pulls.list({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          state: "closed", // open PRs have no impact event; skip them entirely
          sort: "updated",
          direction: "desc",
          per_page: 100,
          page,
        })
      )
    );

    let done = false;

    // Pages are ordered ascending within the batch — process in order so the
    // updated_at cutoff is applied correctly.
    outer: for (const { data } of batched) {
      if (data.length === 0) {
        done = true;
        break;
      }

      for (const pr of data) {
        // updated_at >= merged_at/closed_at, so this is a safe early exit.
        if (pr.updated_at < since) {
          done = true;
          break outer;
        }

        const login = pr.user?.login ?? "unknown";
        if (isBot(login)) continue;

        const merged = pr.merged_at != null;
        const impactAt = merged ? pr.merged_at : pr.closed_at;

        if (!impactAt || impactAt < since) continue;

        results.push({
          number: pr.number,
          title: pr.title,
          body: pr.body ?? null,
          author: login,
          authorAvatarUrl: pr.user?.avatar_url ?? "",
          state: pr.state as "open" | "closed",
          merged,
          mergedAt: pr.merged_at ?? null,
          closedAt: pr.closed_at ?? null,
          createdAt: pr.created_at,
        });
      }
    }

    if (done) break;
    // Last page in the batch being under 100 means GitHub has no more results.
    if (batched[batched.length - 1].data.length < 100) break;
    startPage += CONCURRENT_PAGES;
  }

  return results;
}
