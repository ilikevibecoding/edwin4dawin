"""Exact finite map of the target-polynomial smoothing threshold.

For fixed N, G_(N,d+1)=(D_X+D_Y)G_(N,d), so once an order is stable all
higher orders are stable.  This probe records exact line obstructions below
the apparent threshold and compares it with the Erdős endpoint order
d=(2N+7)/3 when integral.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

from probe_group_order6_sturm import group_matrix
from fast_group_line_sturm_search import (
    digest,
    exact_distinct_real_roots,
    restrict_line,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_target_smoothing_threshold_probe_20260804.json"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=30)
    parser.add_argument("--trials", type=int, default=24)
    parser.add_argument("--seed", type=int, default=993_540_20260804)
    args = parser.parse_args()
    rng = random.Random(args.seed)

    cells = []
    records = []
    for N in range(4, args.max_n + 1):
        endpoint = (2 * N + 7) // 3 if (2 * N + 7) % 3 == 0 else None
        max_d = min(2 * N, (endpoint + 2) if endpoint is not None else (2 * N + 7) // 3 + 2)
        for d in range(4, max_d + 1):
            matrix = group_matrix(N, d)
            expected_degree = max(0, 2 * N - d)
            first_failure = None
            for trial in range(args.trials):
                ax, ay = rng.randint(-3000, 3000), rng.randint(-3000, 3000)
                bx, by = rng.randint(1, 151), rng.randint(1, 151)
                q = restrict_line(matrix, ax, bx, ay, by)
                if q.degree() <= 0:
                    total_real, gcd_degree = 0, 0
                else:
                    real, gcd_degree, _ = exact_distinct_real_roots(q)
                    total_real = real + gcd_degree
                item = {
                    "N": N, "d": d, "trial": trial,
                    "degree": q.degree(),
                    "real_roots_with_multiplicity": total_real,
                    "gcd_degree": gcd_degree,
                    "line": [ax, bx, ay, by], "digest": digest(q),
                }
                records.append(item)
                if q.degree() != expected_degree or total_real != q.degree():
                    first_failure = item
                    break
            status = "FAIL" if first_failure else f"CLEAN_{args.trials}_LINES"
            cells.append({
                "N": N, "d": d, "endpoint_d": endpoint,
                "status": status, "first_failure": first_failure,
            })
            print(
                f"N={N} d={d}{' endpoint' if d == endpoint else ''}: {status}",
                flush=True,
            )

    report = {
        "status": "PROBE_COMPLETE",
        "N_range": [4, args.max_n],
        "trials_per_cell": args.trials,
        "cell_count": len(cells),
        "line_test_count": len(records),
        "cells": cells,
        "records": records,
        "scope": (
            "Failures are exact obstructions.  Clean cells are finite line "
            "screens only.  Stability propagates upward in d by differentiation."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "cell_count": len(cells),
        "line_test_count": len(records),
        "failure_count": sum(c["status"] == "FAIL" for c in cells),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
