import type { ClassifiedPR } from "../types";

const REF_RE = /#(\d+)/g;

export interface EnabledPREntry {
  referencingPRNumber: number;
  referencingPRAuthor: string;
  mergedAt: string;
  creditedAuthor: string; // author of the PR being referenced
  referencedPRNumber: number;
}

export function computeEnabledPRs(
  prs: ClassifiedPR[]
): Map<string, EnabledPREntry[]> {
  // Build lookup: PR number → author (for effective PRs only)
  const effectivePRAuthor = new Map<number, string>();
  for (const pr of prs) {
    if (pr.status === "effective") {
      effectivePRAuthor.set(pr.number, pr.author);
    }
  }

  // Only scan merged PRs (they have mergedAt and a body worth reading)
  const mergedPRs = prs.filter((p) => p.merged && p.mergedAt !== null);

  // credited author → list of enabled PR entries
  const result = new Map<string, EnabledPREntry[]>();

  for (const pr of mergedPRs) {
    if (!pr.body) continue;

    const refs = new Set<number>();
    for (const match of pr.body.matchAll(REF_RE)) {
      refs.add(parseInt(match[1], 10));
    }

    for (const refNumber of refs) {
      // Skip self-references
      if (refNumber === pr.number) continue;

      const creditedAuthor = effectivePRAuthor.get(refNumber);
      // Referenced PR is not in our effective set — skip
      if (creditedAuthor === undefined) continue;
      // Skip if the referencing PR's author is the same as the credited author
      if (pr.author === creditedAuthor) continue;

      // No resolveRef needed: effectivePRAuthor is built from octokit.pulls.list(),
      // which only returns PRs — any number in that map is already a confirmed PR.
      const entry: EnabledPREntry = {
        referencingPRNumber: pr.number,
        referencingPRAuthor: pr.author,
        mergedAt: pr.mergedAt!,
        creditedAuthor,
        referencedPRNumber: refNumber,
      };

      if (!result.has(creditedAuthor)) result.set(creditedAuthor, []);
      result.get(creditedAuthor)!.push(entry);
    }
  }

  return result;
}
