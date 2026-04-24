import { computeEnabledPRs } from "../lib/metrics/multiplier";
import type { ClassifiedPR } from "../lib/types";

function cpr(overrides: Partial<ClassifiedPR> & { number: number; author: string }): ClassifiedPR {
  return {
    title: "some PR",
    body: null,
    authorAvatarUrl: "",
    state: "closed",
    merged: true,
    mergedAt: "2026-02-01T00:00:00Z",
    closedAt: "2026-02-01T00:00:00Z",
    createdAt: "2026-02-01T00:00:00Z",
    status: "effective",
    ...overrides,
  };
}

describe("computeEnabledPRs", () => {
  it("credits an author when another engineer's PR references their effective PR", () => {
    const alice = cpr({ number: 100, author: "alice", status: "effective" });
    const bob = cpr({ number: 101, author: "bob", body: "Builds on #100", status: "effective" });
    const result = computeEnabledPRs([alice, bob]);
    expect(result.get("alice")).toHaveLength(1);
    expect(result.get("alice")![0].referencingPRNumber).toBe(101);
  });

  it("ignores self-references", () => {
    const alice = cpr({ number: 200, author: "alice", body: "See #200 for context", status: "effective" });
    const result = computeEnabledPRs([alice]);
    expect(result.get("alice")).toBeUndefined();
  });

  it("ignores references where the referencing author is the same as the credited author", () => {
    const alice1 = cpr({ number: 300, author: "alice", status: "effective" });
    const alice2 = cpr({ number: 301, author: "alice", body: "Follows up on #300", status: "effective" });
    const result = computeEnabledPRs([alice1, alice2]);
    expect(result.get("alice")).toBeUndefined();
  });

  it("ignores references to ineffective PRs", () => {
    const alice = cpr({ number: 400, author: "alice", status: "ineffective" });
    const bob = cpr({ number: 401, author: "bob", body: "Reverts #400", status: "effective" });
    const result = computeEnabledPRs([alice, bob]);
    expect(result.get("alice")).toBeUndefined();
  });

  it("deduplicates multiple mentions of the same PR in one body", () => {
    const alice = cpr({ number: 500, author: "alice", status: "effective" });
    const bob = cpr({ number: 501, author: "bob", body: "Depends on #500, see also #500", status: "effective" });
    const result = computeEnabledPRs([alice, bob]);
    expect(result.get("alice")).toHaveLength(1);
  });

  it("skips PRs with null or empty body", () => {
    const alice = cpr({ number: 600, author: "alice", status: "effective" });
    const bob = cpr({ number: 601, author: "bob", body: null, status: "effective" });
    const carol = cpr({ number: 602, author: "carol", body: "", status: "effective" });
    const result = computeEnabledPRs([alice, bob, carol]);
    expect(result.get("alice")).toBeUndefined();
  });

  it("does not count unmerged PRs as referencing sources", () => {
    const alice = cpr({ number: 700, author: "alice", status: "effective" });
    const bob = cpr({ number: 701, author: "bob", body: "Based on #700", merged: false, mergedAt: null, status: "ineffective" });
    const result = computeEnabledPRs([alice, bob]);
    expect(result.get("alice")).toBeUndefined();
  });
});
