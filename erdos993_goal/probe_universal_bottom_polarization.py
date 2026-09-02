#!/usr/bin/env python3
"""Test the root-independent polarization of the universal bottom kernel.

If p and q have real roots, then

  p^(r)/p = r! e_r((X-alpha_i)^-1).

Thus a root-independent proof of the generalized bottom target would follow
if the symmetric multiaffine polynomial with coefficients A_(r,s) r! s!
were stable.  By polarization it suffices to test its two-variable diagonal

  H(u,v)=sum A_(r,s) r!s! binom(n,r)binom(m,s)u^r v^s.

This script performs exact affine-line Sturm tests.  A failure rigorously
shows that the solved bottom network still needs special seed geometry.
"""

from __future__ import annotations

import argparse
import json
import random
from math import comb, factorial
from pathlib import Path

from flint import fmpz_mat

from fast_group_line_sturm_search import (
    digest,
    exact_distinct_real_roots,
    restrict_line,
)
from verify_bottom_universal_schur_tp import universal_matrix


HERE = Path(__file__).resolve().parent


def diagonal_matrix(n: int, m: int, order: int) -> fmpz_mat:
    universal = universal_matrix(max(n, m), order)
    width = max(n, m) + 1
    entries = []
    for r in range(width):
        for s in range(width):
            if r <= n and s <= m:
                entries.append(
                    int(universal[r, s])
                    * factorial(r)
                    * factorial(s)
                    * comb(n, r)
                    * comb(m, s)
                )
            else:
                entries.append(0)
    return fmpz_mat(width, width, entries)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=7)
    parser.add_argument("--m", type=int, default=7)
    parser.add_argument("--order", type=int, default=5)
    parser.add_argument("--trials", type=int, default=200)
    parser.add_argument("--bound", type=int, default=500)
    parser.add_argument("--seed", type=int, default=993_611_20260804)
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "universal_bottom_polarization_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    matrix = diagonal_matrix(args.n, args.m, args.order)
    records = []
    failure = None
    for trial in range(args.trials):
        au = rng.randint(-args.bound, args.bound)
        av = rng.randint(-args.bound, args.bound)
        bu = rng.randint(1, 41)
        bv = rng.randint(1, 41)
        line = restrict_line(matrix, au, bu, av, bv)
        real, gcd_degree, sturm_degrees = exact_distinct_real_roots(line)
        record = {
            "trial": trial,
            "line": [au, bu, av, bv],
            "degree": line.degree(),
            "distinct_real_roots": real,
            "gcd_degree": gcd_degree,
            "sha256": digest(line),
        }
        records.append(record)
        if real + gcd_degree != line.degree():
            record["sturm_degrees"] = sturm_degrees
            failure = record
            break
    report = {
        "status": "EXACT_POLARIZATION_OBSTRUCTION" if failure else "FINITE_SCREEN_CLEAN",
        "n": args.n,
        "m": args.m,
        "order": args.order,
        "seed": args.seed,
        "requested_trials": args.trials,
        "completed_trials": len(records),
        "failure": failure,
        "records": records,
        "scope": (
            "An exact failure disproves root-independent stability of the "
            "symmetric multiaffine polarization.  A pass is finite evidence."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
