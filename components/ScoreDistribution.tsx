"use client";

import { useState, useCallback } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { EngineerStats } from "@/lib/types";

interface Props {
  engineers: EngineerStats[];
  top5: EngineerStats[];
  avgImpactfulPRs: number;
  totalContributors: number;
}

const TOP5_COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];
const OTHER_COLOR = "#e0e7ff";
const TOP5_R = 6;
const OTHER_R = 4;
const N_BUCKETS = 10;
const MAX_STACK = 14;

interface DotDatum {
  x: number;
  y: number;
  login: string;
  rank: number | null;
  impactfulPRs: number;
  effectivePRs: number;
  enabledPRs: number;
  qualityRate: number;
  isCountLabel?: boolean;
  count?: number;
}

interface HoverState { datum: DotDatum; cx: number; cy: number }

function buildDots(
  engineers: EngineerStats[],
  top5Logins: Set<string>,
  rankMap: Map<string, number>,
  bucketWidth: number
): DotDatum[] {
  const stacks = new Map<number, number>();           // bucket → current stack height
  const bucketMaxY = new Map<number, number>();       // bucket → highest y placed
  const bucketNonTop5 = new Map<number, number>();    // bucket → count of non-top-5
  const dots: DotDatum[] = [];

  // Top-5 first so they always claim the bottom stack slots
  const ordered = [
    ...engineers.filter((e) => top5Logins.has(e.login)),
    ...engineers.filter((e) => !top5Logins.has(e.login)),
  ];

  for (const eng of ordered) {
    const b = Math.min(Math.floor(eng.impactfulPRs / bucketWidth), N_BUCKETS - 1);
    const cx = b * bucketWidth + bucketWidth / 2;
    const stackY = (stacks.get(b) ?? 0) + 1;
    if (stackY > MAX_STACK) {
      // Still count for the label even if dot is hidden
      if (!top5Logins.has(eng.login)) {
        bucketNonTop5.set(b, (bucketNonTop5.get(b) ?? 0) + 1);
      }
      continue;
    }
    stacks.set(b, stackY);
    bucketMaxY.set(b, Math.max(bucketMaxY.get(b) ?? 0, stackY));

    if (!top5Logins.has(eng.login)) {
      bucketNonTop5.set(b, (bucketNonTop5.get(b) ?? 0) + 1);
    }

    dots.push({
      x: cx,
      y: stackY,
      login: eng.login,
      rank: rankMap.get(eng.login) ?? null,
      impactfulPRs: eng.impactfulPRs,
      effectivePRs: eng.effectivePRs,
      enabledPRs: eng.enabledPRs,
      qualityRate: eng.qualityRate,
    });
  }

  // Add a count label dot floating just above the tallest dot in each bucket
  for (const [b, count] of bucketNonTop5.entries()) {
    if (count === 0) continue;
    const cx = b * bucketWidth + bucketWidth / 2;
    const topY = bucketMaxY.get(b) ?? 1;
    dots.push({
      x: cx,
      y: topY + 0.85,
      login: `__count_${b}`,
      rank: null,
      impactfulPRs: 0,
      effectivePRs: 0,
      enabledPRs: 0,
      qualityRate: 0,
      isCountLabel: true,
      count,
    });
  }

  return dots;
}

function labelRowMap(dots: DotDatum[], bucketWidth: number): Map<string, number> {
  const top5 = dots.filter((d) => d.rank !== null).sort((a, b) => a.x - b.x);
  const rows = new Map<string, number>();
  let lastX = -Infinity;
  let row = 0;
  for (const d of top5) {
    row = d.x - lastX < bucketWidth * 1.2 ? row + 1 : 0;
    rows.set(d.login, row);
    lastX = d.x;
  }
  return rows;
}

export function ScoreDistribution({ engineers, top5, avgImpactfulPRs, totalContributors }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const onEnter = useCallback((d: DotDatum, cx: number, cy: number) => setHover({ datum: d, cx, cy }), []);
  const onLeave = useCallback(() => setHover(null), []);

  if (engineers.length === 0) return null;

  const maxScore = engineers[0].impactfulPRs;
  const bucketWidth = Math.ceil(maxScore / N_BUCKETS);
  const top5Logins = new Set(top5.map((e) => e.login));
  const rankMap = new Map(top5.map((e, i) => [e.login, i + 1]));

  const dots = buildDots(engineers, top5Logins, rankMap, bucketWidth);
  const rowMap = labelRowMap(dots, bucketWidth);
  const maxY = Math.max(...dots.map((d) => d.y), 4) + 1;
  const domainMax = N_BUCKETS * bucketWidth;

  const ticks = Array.from({ length: N_BUCKETS }, (_, i) => i * bucketWidth + bucketWidth / 2);
  const tickFormatter = (v: number) => {
    const b = Math.round((v - bucketWidth / 2) / bucketWidth);
    return `${b * bucketWidth}–${(b + 1) * bucketWidth}`;
  };

  function CustomDot({ cx = 0, cy = 0, payload }: { cx?: number; cy?: number; payload?: DotDatum }) {
    if (!payload) return null;

    // Count label — render as plain number above the stack
    if (payload.isCountLabel) {
      return (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          fontSize={9}
          fill="#9ca3af"
          dy={0}
        >
          {payload.count}
        </text>
      );
    }

    const isTop5 = payload.rank !== null;
    const color = isTop5 ? TOP5_COLORS[payload.rank! - 1] : OTHER_COLOR;
    const r = isTop5 ? TOP5_R : OTHER_R;
    const row = isTop5 ? (rowMap.get(payload.login) ?? 0) : -1;
    const labelOffset = 18 + row * 15;

    return (
      <g
        onMouseEnter={() => onEnter(payload, cx, cy)}
        onMouseLeave={onLeave}
        style={{ cursor: "pointer" }}
      >
        <circle cx={cx} cy={cy} r={r + 8} fill="transparent" />
        <circle
          cx={cx} cy={cy} r={r}
          fill={color}
          opacity={hover && hover.datum.login !== payload.login ? 0.4 : 1}
          style={{ transition: "opacity 0.12s" }}
        />
        {isTop5 && (
          <>
            <text
              x={cx} y={cy - labelOffset}
              textAnchor="middle"
              fontSize={9.5} fontWeight={600} fill={color}
            >
              @{payload.login}
            </text>
            {row > 0 && (
              <line
                x1={cx} y1={cy - r - 1}
                x2={cx} y2={cy - labelOffset + 3}
                stroke={color} strokeWidth={1} strokeDasharray="2 2" opacity={0.45}
              />
            )}
          </>
        )}
      </g>
    );
  }

  return (
    <div className="px-6 py-3 relative">
      <p className="text-xs font-medium text-gray-400 mb-1">
        Contribution Distribution —{" "}
        <span className="font-normal normal-case">{totalContributors} contributors, grouped by range</span>
      </p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={210}>
          <ScatterChart margin={{ top: 52, right: 16, bottom: 20, left: 0 }}>
            <XAxis
              dataKey="x" type="number"
              domain={[0, domainMax]}
              ticks={ticks}
              tick={{ fontSize: 9, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={{ stroke: "#f3f4f6" }}
              tickFormatter={tickFormatter}
            />
            <YAxis dataKey="y" type="number" domain={[0, maxY]} hide />
            <ReferenceLine
              x={avgImpactfulPRs}
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: `avg ${avgImpactfulPRs.toFixed(1)}`, position: "insideTopRight", fontSize: 9, fill: "#f59e0b", dy: -8 }}
            />
            <Scatter
              data={dots}
              shape={(props: unknown) => CustomDot(props as { cx?: number; cy?: number; payload?: DotDatum })}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {hover && !hover.datum.isCountLabel && (
          <div
            className="absolute z-20 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-xl"
            style={{ left: hover.cx, top: hover.cy, transform: "translate(-50%, calc(-100% - 10px))", minWidth: 140 }}
          >
            <p className="font-semibold mb-0.5">@{hover.datum.login}</p>
            <p className="text-indigo-300">{hover.datum.impactfulPRs} impactful PRs</p>
            <p className="text-gray-400">{hover.datum.effectivePRs} effective · {hover.datum.enabledPRs} enabled</p>
            <p className="text-gray-400">{Math.round(hover.datum.qualityRate * 100)}% quality</p>
            <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    </div>
  );
}
