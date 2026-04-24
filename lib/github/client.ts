import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";

if (!process.env.GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN environment variable is not set");
}

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `token ${process.env.GITHUB_TOKEN}` },
});

export const REPO_OWNER = "PostHog";
export const REPO_NAME = "posthog";

export const WINDOW_DAYS = 90;

export function getWindowStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - WINDOW_DAYS);
  return d;
}

// Logins that are bots — excluded from all rankings
const BOT_SUFFIXES = ["[bot]"];
const BOT_EXACT = new Set(["dependabot", "github-actions"]);

export function isBot(login: string): boolean {
  if (BOT_EXACT.has(login)) return true;
  return BOT_SUFFIXES.some((s) => login.endsWith(s));
}
