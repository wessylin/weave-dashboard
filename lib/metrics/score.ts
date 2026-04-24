import type { ClassifiedPR, EngineerStats } from "../types";
import type { EnabledPREntry } from "./multiplier";

const BOT_RE = /\[bot\]$/;

export function computeScores(
  prs: ClassifiedPR[],
  enabledMap: Map<string, EnabledPREntry[]>
): EngineerStats[] {
  const authorData = new Map<
    string,
    { avatarUrl: string; effective: number; ineffective: number }
  >();

  for (const pr of prs) {
    if (pr.status === "open") continue;
    if (BOT_RE.test(pr.author)) continue;

    if (!authorData.has(pr.author)) {
      authorData.set(pr.author, {
        avatarUrl: pr.authorAvatarUrl,
        effective: 0,
        ineffective: 0,
      });
    }
    const d = authorData.get(pr.author)!;
    if (pr.status === "effective") d.effective++;
    else d.ineffective++;
  }

  const stats: EngineerStats[] = [];

  for (const [login, d] of authorData.entries()) {
    const authored = d.effective + d.ineffective;
    if (authored === 0) continue;

    const enabledPRs = enabledMap.get(login)?.length ?? 0;
    // Impactful PRs = Effective + Enabled
    // Quality is a display stat only — enabled PRs are already anchored to
    // effective work (only effective referenced PRs are counted in M3).
    const impactfulPRs = d.effective + enabledPRs;
    const qualityRate = d.effective / authored;

    stats.push({
      login,
      avatarUrl: d.avatarUrl,
      authored,
      effectivePRs: d.effective,
      ineffectivePRs: d.ineffective,
      qualityRate,
      enabledPRs,
      impactfulPRs,
    });
  }

  return stats.sort((a, b) => b.impactfulPRs - a.impactfulPRs);
}
