import { graphqlWithAuth, REPO_OWNER, REPO_NAME } from "./client";

export type RefResult = { isPR: true; author: string } | { isPR: false };

// In-memory cache — one entry per #number, persists for the lifetime of the process
const cache = new Map<number, RefResult>();

// GitHub's node limit per request. 50 aliases keeps well inside complexity limits.
const BATCH_SIZE = 50;

type BatchResponse = {
  repository: Record<string, { author: { login: string } | null } | null>;
};

/**
 * Resolves a batch of #numbers to determine which are PRs vs issues.
 * Uses GraphQL aliases to resolve all numbers in as few round trips as possible
 * rather than one REST call per number.
 */
export async function resolveRefs(
  numbers: number[]
): Promise<Map<number, RefResult>> {
  const uncached = numbers.filter((n) => !cache.has(n));

  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);

    // Each alias is n<number> to avoid leading-digit conflicts in GraphQL identifiers.
    // pullRequest(number: N) returns null if N is an issue or doesn't exist.
    const aliases = batch
      .map((n) => `n${n}: pullRequest(number: ${n}) { author { login } }`)
      .join("\n        ");

    const query = `
      query BatchResolveRefs {
        repository(owner: "${REPO_OWNER}", name: "${REPO_NAME}") {
          ${aliases}
        }
      }
    `;

    const data = await graphqlWithAuth<BatchResponse>(query);

    for (const n of batch) {
      const node = data.repository[`n${n}`];
      const result: RefResult = node
        ? { isPR: true, author: node.author?.login ?? "" }
        : { isPR: false };
      cache.set(n, result);
    }
  }

  return new Map(numbers.map((n) => [n, cache.get(n)!]));
}

export function getCacheSize(): number {
  return cache.size;
}
