#!/usr/bin/env python3
"""Exact line test of the full outer-M marker parent.

Define

  P_(N,d)(X,Y;U,V)
    = B_N[L^(d-4) M(t,s) M(Ut,Vs)].

Then P(X,Y;1,1)=G_(N,d).  Stability of P in all four variables would
therefore prove the group target by specialization.  The component pencils
give a necessary first-order signal for this parent.  This script subjects
the actual four-variable polynomial to exact positive-direction Sturm tests.
Any failure rigorously rules out the parent; clean finite tests are evidence
only.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import sympy as sp

from fast_group_line_sturm_search import (
    affine_power,
    digest,
    exact_distinct_real_roots,
    restrict_line,
)
from probe_quadratic_kernel_monomial_components import (
    X,
    Y,
    component_polynomial,
    integer_matrix,
    seed_coefficients,
    s,
    t,
)


HERE = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cells", default="7:7,8:7,9:7")
    parser.add_argument("--trials", type=int, default=500)
    parser.add_argument("--bound", type=int, default=500)
    parser.add_argument("--seed", type=int, default=993_609_20260804)
    parser.add_argument(
        "--marker-mode",
        choices=("both", "u", "v"),
        default="both",
        help="Retain both markers or specialize one of U,V to 1.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "quadratic_full_marker_parent_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)

    a = t * (1 + t)
    b = s * (1 + s)
    L = a + b
    M = sp.Poly(
        sp.expand((1 + t) * (1 + s) * L**2 - t * s),
        t,
        s,
        domain=sp.ZZ,
    )
    outer_terms = M.terms()
    assert len(outer_terms) == 21

    records = []
    first_failure = None
    for cell in args.cells.split(","):
        N, d = (int(value) for value in cell.split(":"))
        seeds_x = seed_coefficients(N, X, t)
        seeds_y = seed_coefficients(N, Y, s)
        components = {}
        for outer, coefficient in outer_terms:
            polynomial = component_polynomial(N, d, outer, seeds_x, seeds_y)
            components[outer] = (coefficient, integer_matrix(polynomial, N + 1))

        cell_record = {
            "N": N,
            "d": d,
            "lines_tested": 0,
            "status": None,
            "failure": None,
        }
        for trial in range(args.trials):
            ax = rng.randint(-args.bound, args.bound)
            ay = rng.randint(-args.bound, args.bound)
            au = rng.randint(-args.bound, args.bound)
            av = rng.randint(-args.bound, args.bound)
            bx = rng.randint(1, 41)
            by = rng.randint(1, 41)
            bu = rng.randint(1, 41)
            bv = rng.randint(1, 41)
            line = None
            for (i, j), (coefficient, matrix) in components.items():
                upower = (
                    affine_power(au, bu, i)
                    if args.marker_mode in ("both", "u")
                    else affine_power(1, 0, i)
                )
                vpower = (
                    affine_power(av, bv, j)
                    if args.marker_mode in ("both", "v")
                    else affine_power(1, 0, j)
                )
                term = (
                    int(coefficient)
                    * upower
                    * vpower
                    * restrict_line(matrix, ax, bx, ay, by)
                )
                line = term if line is None else line + term
            real, gcd_degree, sturm_degrees = exact_distinct_real_roots(line)
            cell_record["lines_tested"] += 1
            if real + gcd_degree != line.degree():
                failure = {
                    "trial": trial,
                    "line": [ax, bx, ay, by, au, bu, av, bv],
                    "degree": line.degree(),
                    "distinct_real_roots": real,
                    "gcd_degree": gcd_degree,
                    "sturm_degrees": sturm_degrees,
                    "sha256": digest(line),
                }
                cell_record["status"] = "EXACT_LINE_FAILURE"
                cell_record["failure"] = failure
                if first_failure is None:
                    first_failure = {"N": N, "d": d, **failure}
                break
        if cell_record["status"] is None:
            cell_record["status"] = "CLEAN_FINITE_EXACT_LINES"
        records.append(cell_record)
        print(
            f"N={N} d={d}: {cell_record['status']} "
            f"({cell_record['lines_tested']} lines)",
            flush=True,
        )

    report = {
        "status": (
            "FULL_MARKER_PARENT_OBSTRUCTED"
            if first_failure
            else "FINITE_FULL_MARKER_SCREEN_CLEAN"
        ),
        "parent": (
            "B_N[L^(d-4)M(t,s)M(Ut,Vs)] with markers selected by marker_mode"
        ),
        "specialization": "P(X,Y;1,1)=G_(N,d)",
        "parameters": vars(args) | {"out": str(args.out)},
        "records": records,
        "first_failure": first_failure,
        "scope": (
            "An exact line failure rigorously disproves real stability of "
            "the four-variable marker parent.  Clean tests are finite evidence only."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
