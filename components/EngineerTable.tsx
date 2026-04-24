import type { EngineerStats } from "@/lib/types";
import { InfoTooltip } from "./InfoTooltip";

interface Props {
  top5: EngineerStats[];
}

function QualityBadge({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color =
    pct >= 90
      ? "text-green-700 bg-green-50"
      : pct >= 75
      ? "text-yellow-700 bg-yellow-50"
      : "text-red-700 bg-red-50";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {pct}%
    </span>
  );
}

const COLUMNS = [
  {
    label: "#",
    tip: "Overall rank based on Impactful PRs — effective work shipped plus teammates unblocked.",
    example: "e.g. #1 has the highest combined output and leverage",
  },
  {
    label: "Engineer",
    tip: "GitHub handle. Click to view their profile and full contribution history.",
    example: "e.g. @pauldambra → github.com/pauldambra",
  },
  {
    label: "Authored",
    tip: "Total PRs opened in the last 90 days, merged or not. Reflects raw activity level.",
    example: "e.g. 333 PRs opened total",
  },
  {
    label: "Effective / Ineffective",
    tip: "Effective: merged and not reverted. Ineffective: abandoned or reverted. High ineffective counts often reflect experimentation.",
    example: "e.g. 277 merged cleanly / 56 abandoned",
  },
  {
    label: "Enabled",
    tip: "PRs by other engineers that cite one of your merged PRs. Each reference means your work unblocked someone else's.",
    example: "e.g. your PR #1234 was cited in 4 teammates' PRs",
  },
  {
    label: "Quality",
    tip: "Effective ÷ Authored. Share of attempts that shipped clean.",
    example: "e.g. 277 ÷ 333 = 83% · ≥90% green · ≥75% yellow",
  },
  {
    label: "Impactful PRs",
    tip: "Effective + Enabled. Direct output plus downstream work you made possible. Primary ranking metric.",
    example: "e.g. 277 effective + 4 enabled = 281",
  },
];

export function EngineerTable({ top5 }: Props) {
  return (
    <div className="px-6 pb-4">
      <p className="text-xs font-medium text-gray-400 mb-2">
        Top 5 Engineers
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {COLUMNS.map(({ label, tip, example }) => (
              <th
                key={label}
                className="text-left text-xs font-semibold text-gray-500 pb-2 pr-5 whitespace-nowrap"
              >
                {label}
                {tip && <InfoTooltip content={tip} example={example} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {top5.map((eng, i) => (
            <tr key={eng.login} className="hover:bg-gray-50 transition-colors">

              {/* Rank */}
              <td className="py-2.5 pr-5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold">
                  {i + 1}
                </span>
              </td>

              {/* Engineer */}
              <td className="py-2.5 pr-5">
                <a
                  href={`https://github.com/${eng.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 group"
                >
                  <img
                    src={eng.avatarUrl}
                    alt={eng.login}
                    className="w-7 h-7 rounded-full ring-1 ring-gray-200"
                  />
                  <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                    @{eng.login}
                  </span>
                </a>
              </td>

              {/* Authored */}
              <td className="py-2.5 pr-5 text-gray-600 font-mono text-xs">
                {eng.authored}
              </td>

              {/* Effective / Ineffective */}
              <td className="py-2.5 pr-5 font-mono text-xs">
                <span className="text-gray-900">{eng.effectivePRs}</span>
                <span className="text-gray-300 mx-1">/</span>
                <span className="text-red-400">{eng.ineffectivePRs}</span>
              </td>

              {/* Enabled */}
              <td className="py-2.5 pr-5 font-mono text-xs">
                <span className="text-indigo-600 font-semibold">
                  {eng.enabledPRs > 0 ? `+${eng.enabledPRs}` : "—"}
                </span>
              </td>

              {/* Quality */}
              <td className="py-2.5 pr-5">
                <QualityBadge rate={eng.qualityRate} />
              </td>

              {/* Impactful PRs */}
              <td className="py-2.5">
                <span className="text-gray-900 font-bold text-base">
                  {eng.impactfulPRs}
                </span>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
