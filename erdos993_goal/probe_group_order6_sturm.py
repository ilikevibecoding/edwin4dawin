"""Fast exact Sturm screen of the universal order-six group polynomial.

If G_(N,6) were real stable for every N, then every required endpoint with
d>=6 would follow immediately from

  G_(N,d)=(D_X+D_Y)^(d-6) G_(N,6).

The script searches for exact positive-direction line counterexamples using
the integer coefficient-matrix construction.  A clean run is evidence only.
"""

from __future__ import annotations

import argparse
import json
import random
from math import factorial
from pathlib import Path

from flint import fmpz_mat

from fast_group_line_sturm_search import (
    anti_binomial,
    derivative_matrix,
    digest,
    exact_distinct_real_roots,
    restrict_line,
    scaled_seed_coefficients,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_order6_sturm_probe_20260804.json"


def group_matrix(N: int, d: int = 6) -> fmpz_mat:
    width = N + 1
    seeds = [scaled_seed_coefficients(N - shift, width) for shift in range(3)]
    orders = [d, d - 2, d - 4]
    falling2 = [1, N * N, N * N * (N - 1) * (N - 1)]
    signs = [1, -2, 1]
    result = fmpz_mat(width, width)
    for seed, order, scale, sign in zip(seeds, orders, falling2, signs):
        derivatives = derivative_matrix(seed, order)
        result += sign * scale * (
            derivatives.transpose() * anti_binomial(order) * derivatives
        )
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=60)
    parser.add_argument("--trials", type=int, default=12)
    parser.add_argument("--seed", type=int, default=993_539_20260804)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    records = []
    first_failure = None
    for N in range(3, args.max_n + 1):
        matrix = group_matrix(N)
        expected_degree = max(0, 2 * N - 6)
        for trial in range(args.trials):
            ax, ay = rng.randint(-2000, 2000), rng.randint(-2000, 2000)
            bx, by = rng.randint(1, 101), rng.randint(1, 101)
            q = restrict_line(matrix, ax, bx, ay, by)
            if q.degree() <= 0:
                real, gcd_degree, total_real = 0, 0, 0
            else:
                real, gcd_degree, _ = exact_distinct_real_roots(q)
                total_real = real + gcd_degree
            item = {
                "N": N, "trial": trial, "degree": q.degree(),
                "real_roots_with_multiplicity": total_real,
                "gcd_degree": gcd_degree,
                "line": [ax, bx, ay, by], "digest": digest(q),
            }
            records.append(item)
            if q.degree() != expected_degree or total_real != q.degree():
                first_failure = item
                break
        print(
            f"N={N}: "
            f"{'FAIL' if first_failure else 'clean ' + str(args.trials)}",
            flush=True,
        )
        if first_failure is not None:
            break

    report = {
        "status": "COUNTEREXAMPLE" if first_failure else "PASS_PROBE_ONLY",
        "N_range_attempted": [3, records[-1]["N"]] if records else None,
        "trials_per_N": args.trials,
        "line_test_count": len(records),
        "first_failure": first_failure,
        "records": records,
        "scope": (
            "A counterexample rules out the order-six reduction.  A clean "
            "finite Sturm screen is not a proof of bivariate stability."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "N_range_attempted": report["N_range_attempted"],
        "line_test_count": len(records),
        "first_failure": first_failure,
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
