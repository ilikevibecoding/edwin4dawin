"""Exact Sturm stress test for the candidate linear smoothing cone.

The finite threshold map suggests

  G_(N,d) is real stable whenever 2d-N >= 5.

For each N this script tests the first integer d inside that cone and the
immediately preceding order.  Stability then propagates to all larger d by
D_X+D_Y.  Exact failures below the boundary and clean screens on it provide
a sharply localized conjectural lemma; they are not an all-order proof.
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
REPORT = HERE / "group_linear_smoothing_cone_probe_20260804.json"


def test_cell(N: int, d: int, trials: int, rng: random.Random) -> tuple[list[dict], dict | None]:
    matrix = group_matrix(N, d)
    expected_degree = max(0, 2 * N - d)
    records = []
    first_failure = None
    for trial in range(trials):
        ax, ay = rng.randint(-10000, 10000), rng.randint(-10000, 10000)
        bx, by = rng.randint(1, 401), rng.randint(1, 401)
        q = restrict_line(matrix, ax, bx, ay, by)
        if q.degree() <= 0:
            total_real, gcd_degree = 0, 0
        else:
            real, gcd_degree, _ = exact_distinct_real_roots(q)
            total_real = real + gcd_degree
        item = {
            "N": N, "d": d, "trial": trial,
            "degree": q.degree(), "real_roots_with_multiplicity": total_real,
            "gcd_degree": gcd_degree,
            "line": [ax, bx, ay, by], "digest": digest(q),
        }
        records.append(item)
        if q.degree() != expected_degree or total_real != q.degree():
            first_failure = item
            break
    return records, first_failure


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=80)
    parser.add_argument("--boundary-trials", type=int, default=40)
    parser.add_argument("--below-trials", type=int, default=400)
    parser.add_argument("--seed", type=int, default=993_541_20260804)
    args = parser.parse_args()
    rng = random.Random(args.seed)

    cells = []
    all_records = []
    for N in range(4, args.max_n + 1):
        boundary_d = (N + 6) // 2  # least integer d with 2d-N >= 5
        for label, d, trials in (
            ("below", boundary_d - 1, args.below_trials),
            ("boundary", boundary_d, args.boundary_trials),
        ):
            records, failure = test_cell(N, d, trials, rng)
            all_records.extend(records)
            cells.append({
                "N": N, "d": d, "side": label, "two_d_minus_N": 2 * d - N,
                "trials_requested": trials,
                "status": "FAIL" if failure else f"CLEAN_{trials}_LINES",
                "first_failure": failure,
            })
            print(
                f"N={N} {label} d={d} (2d-N={2*d-N}): "
                f"{'FAIL' if failure else 'clean ' + str(trials)}",
                flush=True,
            )

    report = {
        "status": "PROBE_COMPLETE",
        "candidate_cone": "2d-N>=5",
        "N_range": [4, args.max_n],
        "cells": cells,
        "line_test_count": len(all_records),
        "records": all_records,
        "scope": (
            "Boundary clean screens are finite evidence only.  Exact failures "
            "below the boundary show sharpness for the corresponding cells."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "candidate_cone": report["candidate_cone"],
        "N_range": report["N_range"],
        "line_test_count": len(all_records),
        "boundary_failure_count": sum(
            c["side"] == "boundary" and c["status"] == "FAIL" for c in cells
        ),
        "below_failure_count": sum(
            c["side"] == "below" and c["status"] == "FAIL" for c in cells
        ),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
