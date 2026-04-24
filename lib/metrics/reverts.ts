import type { RawPR } from "../types";

const REVERT_TITLE_RE = /^Revert "(.+)"$/;
// GitHub auto-generates "Reverts #N" in the body of revert PRs
const REVERT_BODY_RE = /\breverts\s+#(\d+)\b/gi;

/**
 * Returns a Set of PR numbers that are net-reverted (i.e. reverted and not
 * subsequently re-merged via a revert-of-revert).
 *
 * Detection sources (in priority order per PR):
 *   1. Title matches `Revert "..."` → cross-matched against merged PR titles
 *   2. Body contains `Reverts #N` → GitHub's auto-generated revert body text
 *
 * Revert-of-revert: if the revert PR itself was reverted, the original PR is
 * back to effective and is excluded from the returned set.
 */
export function findRevertedPRNumbers(prs: RawPR[]): Set<number> {
  const mergedByTitle = new Map<string, number>();
  const mergedNumbers = new Set<number>();
  for (const pr of prs) {
    if (pr.merged) {
      mergedByTitle.set(pr.title, pr.number);
      mergedNumbers.add(pr.number);
    }
  }

  // originalPR → set of merged PRs that reverted it (multiple reverts of the same PR are possible)
  const reverters = new Map<number, Set<number>>();

  function addReverter(originalPR: number, revertPR: number) {
    if (!reverters.has(originalPR)) reverters.set(originalPR, new Set());
    reverters.get(originalPR)!.add(revertPR);
  }

  for (const pr of prs) {
    if (!pr.merged) continue;

    const titleMatch = REVERT_TITLE_RE.exec(pr.title);
    if (titleMatch) {
      const originalNumber = mergedByTitle.get(titleMatch[1]);
      if (originalNumber !== undefined) {
        addReverter(originalNumber, pr.number);
        continue; // title match is authoritative
      }
    }

    if (pr.body) {
      for (const m of pr.body.matchAll(REVERT_BODY_RE)) {
        const refNumber = parseInt(m[1], 10);
        if (refNumber !== pr.number && mergedNumbers.has(refNumber)) {
          addReverter(refNumber, pr.number);
          break;
        }
      }
    }
  }

  // A PR is net-reverted if any of its reverters is not itself net-reverted.
  // Memoized recursion handles arbitrary chain depth and multiple reverters correctly.
  const memo = new Map<number, boolean>();

  function isNetReverted(prNumber: number): boolean {
    if (memo.has(prNumber)) return memo.get(prNumber)!;
    const prReverters = reverters.get(prNumber);
    if (!prReverters) {
      memo.set(prNumber, false);
      return false;
    }
    const result = [...prReverters].some((r) => !isNetReverted(r));
    memo.set(prNumber, result);
    return result;
  }

  const netReverted = new Set<number>();
  for (const prNumber of reverters.keys()) {
    if (isNetReverted(prNumber)) netReverted.add(prNumber);
  }
  return netReverted;
}
