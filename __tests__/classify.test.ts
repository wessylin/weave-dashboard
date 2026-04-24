import { classifyPRs } from "../lib/metrics/classify";
import type { RawPR } from "../lib/types";

function pr(overrides: Partial<RawPR> & { number: number; title: string; author: string }): RawPR {
  return {
    body: null,
    authorAvatarUrl: "",
    state: "closed",
    merged: false,
    mergedAt: null,
    closedAt: "2026-01-01T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("classifyPRs", () => {
  it("marks merged non-reverted PRs as effective", () => {
    const prs = [pr({ number: 1, title: "feat: add feature", author: "alice", merged: true, mergedAt: "2026-01-02T00:00:00Z" })];
    const result = classifyPRs(prs);
    expect(result[0].status).toBe("effective");
  });

  it("marks closed-without-merge PRs as ineffective", () => {
    const prs = [pr({ number: 2, title: "wip: something", author: "alice", merged: false, state: "closed" })];
    const result = classifyPRs(prs);
    expect(result[0].status).toBe("ineffective");
  });

  it("marks open PRs as open", () => {
    const prs = [pr({ number: 3, title: "draft: in progress", author: "alice", merged: false, state: "open", closedAt: null })];
    const result = classifyPRs(prs);
    expect(result[0].status).toBe("open");
  });

  it("marks a reverted PR as ineffective", () => {
    const original = pr({ number: 10, title: "feat: big change", author: "alice", merged: true, mergedAt: "2026-01-01T00:00:00Z" });
    const revert = pr({ number: 11, title: 'Revert "feat: big change"', author: "bob", merged: true, mergedAt: "2026-01-03T00:00:00Z" });
    const result = classifyPRs([original, revert]);
    const byNumber = Object.fromEntries(result.map((p) => [p.number, p]));
    expect(byNumber[10].status).toBe("ineffective");
    expect(byNumber[11].status).toBe("effective"); // the revert PR itself is effective
  });

  it("does not mark a revert-of-revert as ineffective", () => {
    const original = pr({ number: 20, title: "feat: thing", author: "alice", merged: true, mergedAt: "2026-01-01T00:00:00Z" });
    const revert = pr({ number: 21, title: 'Revert "feat: thing"', author: "bob", merged: true, mergedAt: "2026-01-02T00:00:00Z" });
    const revertOfRevert = pr({ number: 22, title: 'Revert "Revert "feat: thing""', author: "carol", merged: true, mergedAt: "2026-01-03T00:00:00Z" });
    const result = classifyPRs([original, revert, revertOfRevert]);
    const byNumber = Object.fromEntries(result.map((p) => [p.number, p]));
    // original was reverted by #21, but #21 was itself reverted by #22 → original is back to effective
    expect(byNumber[20].status).toBe("effective");
  });
});
