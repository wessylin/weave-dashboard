import { computeScores } from "../lib/metrics/score";
import type { ClassifiedPR, EngineerStats } from "../lib/types";
import type { EnabledPREntry } from "../lib/metrics/multiplier";

function cpr(overrides: Partial<ClassifiedPR> & { number: number; author: string }): ClassifiedPR {
  return {
    title: "pr",
    body: null,
    authorAvatarUrl: "https://avatars.githubusercontent.com/u/1",
    state: "closed",
    merged: true,
    mergedAt: "2026-01-01T00:00:00Z",
    closedAt: "2026-01-01T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    status: "effective",
    ...overrides,
  };
}

function enabledMap(entries: Record<string, number>): Map<string, EnabledPREntry[]> {
  const m = new Map<string, EnabledPREntry[]>();
  for (const [author, count] of Object.entries(entries)) {
    m.set(author, Array.from({ length: count }, (_, i) => ({
      referencingPRNumber: 9000 + i,
      referencingPRAuthor: "other",
      mergedAt: "2026-01-02T00:00:00Z",
      creditedAuthor: author,
      referencedPRNumber: i,
    })));
  }
  return m;
}

describe("computeScores", () => {
  it("computes impactfulPRs = effectivePRs + enabledPRs", () => {
    const prs = [
      cpr({ number: 1, author: "alice", status: "effective" }),
      cpr({ number: 2, author: "alice", status: "effective" }),
      cpr({ number: 3, author: "alice", status: "ineffective" }),
    ];
    const [result] = computeScores(prs, enabledMap({ alice: 3 }));
    expect(result.effectivePRs).toBe(2);
    expect(result.ineffectivePRs).toBe(1);
    expect(result.enabledPRs).toBe(3);
    expect(result.impactfulPRs).toBe(5); // 2 effective + 3 enabled
  });

  it("computes qualityRate as effectivePRs / authored", () => {
    const prs = [
      cpr({ number: 1, author: "alice", status: "effective" }),
      cpr({ number: 2, author: "alice", status: "effective" }),
      cpr({ number: 3, author: "alice", status: "effective" }),
      cpr({ number: 4, author: "alice", status: "ineffective" }),
    ];
    const [result] = computeScores(prs, new Map());
    expect(result.authored).toBe(4);
    expect(result.qualityRate).toBeCloseTo(0.75);
  });

  it("sorts descending by impactfulPRs", () => {
    const prs = [
      cpr({ number: 1, author: "alice", status: "effective" }),
      cpr({ number: 2, author: "bob", status: "effective" }),
      cpr({ number: 3, author: "bob", status: "effective" }),
    ];
    const results = computeScores(prs, new Map());
    expect(results[0].login).toBe("bob");
    expect(results[1].login).toBe("alice");
  });

  it("excludes open PRs from authored count", () => {
    const prs = [
      cpr({ number: 1, author: "alice", status: "effective" }),
      cpr({ number: 2, author: "alice", status: "open", merged: false, mergedAt: null }),
    ];
    const [result] = computeScores(prs, new Map());
    expect(result.authored).toBe(1);
  });

  it("filters out bot accounts", () => {
    const prs = [
      cpr({ number: 1, author: "dependabot[bot]", status: "effective" }),
      cpr({ number: 2, author: "alice", status: "effective" }),
    ];
    const results = computeScores(prs, new Map());
    expect(results).toHaveLength(1);
    expect(results[0].login).toBe("alice");
  });

  it("skips engineers with zero authored PRs", () => {
    const results = computeScores([], new Map());
    expect(results).toHaveLength(0);
  });

  it("includes enabled PRs in impactfulPRs even when effectivePRs is low", () => {
    const prs = [cpr({ number: 1, author: "alice", status: "effective" })];
    const [result] = computeScores(prs, enabledMap({ alice: 10 }));
    expect(result.impactfulPRs).toBe(11); // 1 effective + 10 enabled
  });
});
