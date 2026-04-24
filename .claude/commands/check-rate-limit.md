Check the current GitHub API rate limit status for this project.

Run the following and report the results clearly:

```bash
export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/check-rate-limit.ts
```

Report the output to the user. If remaining is below 500, warn them that the reference resolution step (M3) may hit the rate limit and suggest waiting until the reset time before running the full pipeline.
