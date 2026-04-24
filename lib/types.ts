export type PRStatus = "effective" | "ineffective" | "open";

export interface RawPR {
  number: number;
  title: string;
  body: string | null;
  author: string;
  authorAvatarUrl: string;
  state: "open" | "closed";
  merged: boolean;
  mergedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

export interface ClassifiedPR extends RawPR {
  status: PRStatus;
}

export interface EngineerStats {
  login: string;
  avatarUrl: string;
  authored: number;        // effective + ineffective (excludes open)
  effectivePRs: number;
  ineffectivePRs: number;
  qualityRate: number;     // effectivePRs / authored
  enabledPRs: number;
  impactfulPRs: number;  // effectivePRs + enabledPRs
}

export interface LeaderboardResponse {
  engineers: EngineerStats[];   // all contributors, sorted desc by impactfulPRs
  top5: EngineerStats[];
  windowStart: string;          // ISO date
  windowEnd: string;            // ISO date
  totalContributors: number;
  avgImpactfulPRs: number;
}
