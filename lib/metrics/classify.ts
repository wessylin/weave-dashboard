import type { RawPR, ClassifiedPR } from "../types";
import { findRevertedPRNumbers } from "./reverts";

export function classifyPRs(prs: RawPR[]): ClassifiedPR[] {
  const revertedNumbers = findRevertedPRNumbers(prs);

  return prs.map((pr) => {
    let status: ClassifiedPR["status"];

    if (pr.state === "open") {
      status = "open";
    } else if (!pr.merged) {
      // Closed without merging = abandoned
      status = "ineffective";
    } else if (revertedNumbers.has(pr.number)) {
      // Merged but subsequently reverted
      status = "ineffective";
    } else {
      status = "effective";
    }

    return { ...pr, status };
  });
}
