# Project Specification: PostHog Top 5 Engineers Dashboard

## Overview
A single-page Next.js dashboard that analyzes the `PostHog/posthog` GitHub repository to identify and rank the top 5 most impactful engineers over the last 90 days. Built as a takehome assessment for Weave YC.

**Primary audience:** An engineering leader who understands the domain but is not in the weeds of every PR. The dashboard must be self-explanatory at a glance — no raw GitHub jargon, no data dumps. Every number shown should answer a question the leader actually has.

**Goal:** Surface who is *actually* driving the project — quality output, foundational work that unblocks others — rather than rewarding raw PR volume or lines of code.

---

## Data Source
- **Repository:** `PostHog/posthog` (public)
- **Time window:** Rolling last 90 days from query time
- **API:** GitHub REST API via `@octokit/rest`, authenticated with `GITHUB_TOKEN`
- **Bot exclusion:** Any author with login ending in `[bot]` (e.g. `dependabot`, `github-actions[bot]`) is excluded from rankings

---

## Metrics

### 1. Output Quality
Measures the ratio of shipped, reliable work to total attempts.

| Bucket | Definition |
|---|---|
| **Effective PR** | Merged AND not subsequently reverted |
| **Ineffective PR** | Closed without merge (abandoned) OR merged then reverted |
| **Total PRs** | Effective + Ineffective |
| **Quality Rate** | `Effective / Total` — displayed as a percentage, not used in Impact Score |

**Revert detection:** Scan merged PR titles for the pattern `Revert "..."`. The referenced original PR title is cross-matched to find and mark the reverted PR as ineffective.

### 2. Team Multiplier Effect
Measures how much an engineer's work enables others.

- For each merged PR by engineer A, scan the **body** of every other merged PR in the window for `#<A's PR number>`.
- Each match = one **enabled PR** credited to engineer A.
- **Credit timing:** Attributed to the week of the *referencing* PR's merge date.
- **Exclusions:**
  - Self-references (author of the referencing PR is the same as A) → excluded
  - References that resolve to GitHub Issues (not PRs) → excluded
  - Duplicate references to the same PR number in one body → counted once

**Resolution:** Each `#number` pattern is resolved via `GET /repos/PostHog/posthog/pulls/{number}` to confirm it is a PR. Results are cached in-memory to avoid redundant API calls.

### 3. Impact Score (Composite — primary ranking metric)
```
Impact Score = Effective_PRs + 1.5 × Enabled_PRs
```
- `1.5` is the enabling weight (α): rewards foundational work without letting one viral PR dominate
- Quality is captured implicitly: ineffective PRs are excluded from `Effective_PRs`

---

## API

### `GET /api/leaderboard`
Returns the top 5 engineers by Impact Score.

**Response shape:**
```ts
type EngineerStats = {
  login: string;           // GitHub username
  avatarUrl: string;       // GitHub avatar URL
  totalPRs: number;        // effective + ineffective
  effectivePRs: number;    // merged and not reverted
  ineffectivePRs: number;  // abandoned or reverted
  qualityRate: number;     // effectivePRs / totalPRs (0–1)
  enabledPRs: number;      // count of other engineers' merged PRs referencing their work
  impactScore: number;     // effectivePRs + 1.5 * enabledPRs
};

// Route returns: EngineerStats[]  (length 5, sorted desc by impactScore)
```

**Caching:** ISR with `revalidate: 3600` (1 hour). GitHub API calls only run server-side.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| GitHub API | `@octokit/rest` |
| Charts | Recharts |
| Deployment | Vercel (recommended) |

---

## File Structure
```
/
├── CLAUDE.md             ← agent context (start here)
├── SPEC.md               ← this file
├── DECISIONS.md          ← design decision log
├── .env.local            ← GITHUB_TOKEN (not committed)
└── src/  (or app/)
    ├── app/
    │   ├── page.tsx                   ← dashboard UI
    │   └── api/leaderboard/route.ts   ← data pipeline + API
    ├── lib/
    │   ├── github/
    │   │   ├── client.ts              ← Octokit instance
    │   │   ├── fetchPRs.ts            ← paginate PRs in 90-day window
    │   │   └── resolveRef.ts          ← resolve #number → PR or issue
    │   ├── metrics/
    │   │   ├── classify.ts            ← label each PR effective/ineffective
    │   │   ├── reverts.ts             ← detect reverted PRs
    │   │   ├── multiplier.ts          ← compute enabled PRs per engineer
    │   │   └── score.ts               ← compute impact score + quality rate
    │   └── types.ts                   ← shared TypeScript types
    └── components/
        ├── Leaderboard.tsx            ← ranked list with bars
        └── EngineerBar.tsx            ← single stacked bar row
```

---

## Milestones (implementation order)
1. **M1** — Scaffold + GitHub API client; verify raw PR fetch works
2. **M2** — Classify effective/ineffective PRs; verify with spot-check
3. **M3** — Enabled PRs (reference parsing + resolution); verify with known dependency chain
4. **M4** — Scoring + ranking; verify full ranked list in console
5. **M5** — API route + ISR caching; verify with `curl /api/leaderboard`
6. **M6** — UI bar chart leaderboard; verify visually in browser
7. **M7** — Edge cases + unit tests; verify all tests pass

---

## Environment Variables
```
GITHUB_TOKEN=ghp_...   # Personal access token with public_repo scope
```

---

## UI Principles (audience-driven)
The viewer is an engineering leader — not a developer. Apply these rules to every UI decision:

- **No raw jargon.** Don't say "merged PRs not reverted." Say "Shipped work."
- **Lead with rank and score.** The most important signal is the ordering, not the raw numbers.
- **Explain the breakdown.** Each bar segment should be labeled in plain English (e.g. "Unblocked teammates").
- **Avatars + names.** Show GitHub avatar and display name, not just a login handle.
- **No scrolling.** Top 5 must fit in a single viewport on a standard laptop screen.
- **Context over data.** A short sentence explaining the metric is more valuable than an extra decimal place.

---

## Known Constraints & Gotchas
- GitHub's `#number` namespace is shared between PRs and issues — always resolve before crediting
- Rate limit: 5,000 req/hr authenticated. Reference resolution (M3) is the expensive step — cache aggressively
- Revert detection is title-based and can miss manual reverts that don't follow the `Revert "..."` convention
- The 90-day window is computed at request time; ISR means the window shifts by at most 1 hour between cache refreshes
