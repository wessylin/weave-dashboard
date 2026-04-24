# CLAUDE.md — PostHog Top 5 Engineers Dashboard

## What this project is
A single-page dashboard that analyzes the `PostHog/posthog` GitHub repository to identify and rank the top 5 most impactful engineers over the last 90 days. Built as a Weave YC takehome assessment.

**Audience:** An engineering leader who understands the domain but is not in the weeds of every PR. The UI must be self-explanatory — no raw GitHub jargon, no data dumps. Labels and tooltips should speak to impact, not implementation detail.

**Read SPEC.md for the full project specification.**  
**Read DECISIONS.md for the rationale behind every design choice.**

---

## How to run

```bash
# Install dependencies
npm install

# Add your GitHub token (public_repo scope is sufficient)
echo "GITHUB_TOKEN=ghp_..." > .env.local

# Start dev server
npm run dev
# → http://localhost:3000

# Type check
npm run type-check

# Run tests
npm test
```

---

## The core formula

```
Impact Score = Effective_PRs + 1.5 × Enabled_PRs
```

- **Effective PR:** merged and not subsequently reverted
- **Ineffective PR:** closed-without-merge or merged-then-reverted  
- **Enabled PR:** another engineer's merged PR whose body contains `#<your-PR-number>` (resolved to confirm it's a PR, not an issue; self-refs excluded)
- **Quality Rate:** `Effective / Total` — display stat only, not used in score
- **Time window:** rolling last 90 days
- **α = 1.5** — see DECISIONS.md for why

---

## Key files

| File | Purpose |
|---|---|
| `src/lib/github/client.ts` | Octokit instance, reads `GITHUB_TOKEN` |
| `src/lib/github/fetchPRs.ts` | Paginates all PRs from `PostHog/posthog` in the 90-day window |
| `src/lib/github/resolveRef.ts` | Resolves `#number` → PR or issue; cached in memory |
| `src/lib/metrics/reverts.ts` | Detects reverted PRs by title pattern `Revert "..."` |
| `src/lib/metrics/classify.ts` | Labels every PR as effective or ineffective |
| `src/lib/metrics/multiplier.ts` | Parses PR bodies for `#number` refs, attributes enabled PRs |
| `src/lib/metrics/score.ts` | Computes impact score and quality rate per engineer |
| `src/lib/types.ts` | Shared `EngineerStats` type |
| `src/app/api/leaderboard/route.ts` | Next.js API route — runs full pipeline, cached 1hr via ISR |
| `src/app/page.tsx` | Dashboard page — fetches leaderboard, renders chart |
| `src/components/Leaderboard.tsx` | Ranked list of engineer bars |
| `src/components/EngineerBar.tsx` | Stacked horizontal bar: green=effective, blue=enabled, red=ineffective |

---

## Important constraints
- **Never expose `GITHUB_TOKEN` to the browser.** All GitHub API calls happen in `route.ts` (server-side only).
- **Rate limits:** GitHub allows 5,000 req/hr authenticated. `resolveRef.ts` caches every lookup — do not bypass the cache.
- **Bot exclusion:** Filter out any `login` ending in `[bot]` before computing scores.
- **Self-references:** A PR body referencing the same author's own PR number must be excluded from the multiplier.
- **PR vs. issue:** `#number` in a PR body could be an issue. Always call `resolveRef` before crediting an enabled PR.

---

## What good output looks like
`GET /api/leaderboard` should return an array of 5 `EngineerStats` objects sorted descending by `impactScore`. The top engineers should be recognizable PostHog core contributors (e.g. @timgl, @pauldambra, @mariusandra). If the top result is a bot or an unfamiliar username, something is wrong.
