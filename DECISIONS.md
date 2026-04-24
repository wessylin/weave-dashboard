# Design Decisions

A living record of architectural and product decisions made during development, with rationale. Update this when a decision changes.

---

## Metrics

### Decision: 3 dimensions only (not 5+)
**Chosen:** Output Quality, Team Multiplier, Impact Score  
**Rejected:** Review depth, domain consistency, cycle time, active weeks, and other secondary signals  
**Why:** Simpler metrics are more defensible in a presentation. Every number on the dashboard should be explainable in one sentence. Adding more dimensions risks hiding the signal in noise.

### Decision: Output Quality = effective PRs / total PRs (rate, not count)
**Chosen:** Quality rate as a display stat; effective PR count feeds into Impact Score  
**Rejected:** Using raw PR count or LOC  
**Why:** A rate penalizes noise and abandoned work without requiring a complex weighting scheme. Raw counts reward volume over quality.

### Decision: Effective PR = merged AND not subsequently reverted
**Chosen:** Revert detection via PR title pattern `Revert "..."` on merged PRs  
**Rejected:** Treating all merged PRs as effective  
**Why:** A reverted PR represents net-zero or negative work. Crediting it distorts the signal.

### Decision: Ineffective PR = closed-without-merge OR merged-then-reverted
**Chosen:** Both buckets treated identically as ineffective  
**Rejected:** Treating abandoned PRs differently from reverted ones  
**Why:** Both represent effort that didn't ship. Distinguishing them adds complexity without changing the score.

### Decision: Team Multiplier = `#<PR-number>` references in other engineers' merged PR bodies
**Chosen:** Count of merged PRs (by others) whose body contains `#<your-PR-number>`  
**Rejected:** Review count, review comment depth, mentorship signals  
**Why:** PR body references are a direct proxy for dependency and enablement. If your PR unblocked someone else's work, they will typically reference it. This is organic signal, not a gameable metric.

**Credit timing:** Attributed to the week of the *referencing* PR's merge (not the original PR's merge), so the multiplier reflects when the downstream value was realized.

**Self-references excluded:** A PR body referencing the author's own PR number does not count.

**PR vs. issue disambiguation:** GitHub shares the `#number` namespace. Each reference is resolved via API to confirm it points to a PR, not an issue.

### Decision: α = 1.5 for enabled PR weight
**Chosen:** `Impact Score = Effective_PRs + 1.5 × Enabled_PRs`  
**Rejected:** α = 1.0 (undersells multiplier), α = 2.0 (one viral PR dominates), log scaling (harder to explain)  
**Why:** 1.5 is meaningful enough to reward foundational work but not so extreme that a single heavily-referenced PR collapses the ranking. Simple, linear, and explainable in an interview.

### Decision: Impact Score uses Option B (quality implicit, not a multiplier)
**Chosen:** `Impact = Effective_PRs + 1.5 × Enabled_PRs`  
**Rejected:** Option A — `Impact = Quality_Rate × (Effective + 1.5 × Enabled)`  
**Why:** Effective PRs already exclude ineffective ones, so quality is implicitly captured. Option A double-penalizes noise, which is too harsh and counterintuitive.

---

## Data

### Decision: 90-day rolling window
**Chosen:** Last 90 days from query time  
**Rejected:** All-time, last 12 months  
**Why:** Surfaces currently active contributors, not historical figures who may have left. 90 days is long enough to smooth weekly variance.

### Decision: GitHub REST API + Octokit
**Chosen:** `@octokit/rest` for PR/issue fetching, `@octokit/graphql` if needed for richer queries  
**Rejected:** Raw fetch calls, third-party GitHub analytics services  
**Why:** Official SDK handles pagination, rate limiting headers, and auth cleanly.

### Decision: Filter out bots before ranking
**Chosen:** Exclude `dependabot`, `github-actions[bot]`, and any login ending in `[bot]`  
**Rejected:** Including bots (they would trivially top the leaderboard)  
**Why:** Bots open and merge PRs mechanically. Their output doesn't represent engineering impact.

---

## Architecture

### Decision: Next.js + TypeScript
**Chosen:** Next.js App Router with TypeScript and Tailwind  
**Rejected:** Plain React + Vite, static HTML  
**Why:** Server-side API routes keep the GitHub token safe (not exposed to the browser). ISR caching means the expensive GitHub API calls don't run on every page load. Easy Vercel deploy.

### Decision: ISR caching at 1-hour revalidation
**Chosen:** `next: { revalidate: 3600 }` on the API route  
**Rejected:** No caching (hammers rate limits), longer TTL (data goes stale)  
**Why:** GitHub's rate limit is 5,000 req/hr for authenticated requests. The reference-resolution step in M3 can make hundreds of calls. Caching the result for an hour is the right tradeoff.

---

## Visualization

### Decision: Bar chart leaderboard (not radar chart)
**Chosen:** Horizontal stacked bar per engineer — green (effective), blue (enabled ×1.5), red (ineffective)  
**Rejected:** Radar/spider chart, card grid with sparklines  
**Why:** A bar chart directly maps to the Impact Score formula, making the ranking self-explanatory. Radar charts obscure the composite score.
