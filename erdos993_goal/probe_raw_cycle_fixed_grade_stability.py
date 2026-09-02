#!/usr/bin/env python3
"""Probe the inverse-factorial raw fixed-grade cycle contraction.

Conjugating ordinary differentiation by the Laguerre multiplier B_N turns
it into coefficient lowering L(X^a)=X^(a-1).  Hence the normalized group
target is (B_N tensor B_N) applied to

  L^d(p_N p_N)-2 L^(d-2)(p_(N-1)p_(N-1))
    +L^(d-4)(p_(N-2)p_(N-2)),

where L=L_X+L_Y.  If this raw target is stable, the already-proved Laguerre
multiplier theorem finishes the normalized target.  Exact failures would
rule out that shortcut.
"""

from __future__ import annotations

import json
import random
from math import comb
from pathlib import Path

import sympy as sp
from flint import fmpz_mat

from fast_group_line_sturm_search import (
    digest,
    exact_distinct_real_roots,
    restrict_line,
)
from prove_colored_cycle_core_stability import X, Y, p


HERE = Path(__file__).resolve().parent
REPORT = HERE / "raw_cycle_fixed_grade_stability_probe_20260804.json"


def lower(expression: sp.Expr, order: int) -> sp.Expr:
    polynomial = sp.Poly(expression, X, Y, domain=sp.QQ)
    result = sp.S.Zero
    for (a, b), coefficient in polynomial.terms():
        for r in range(order + 1):
            if r <= a and order - r <= b:
                result += (
                    coefficient * comb(order, r)
                    * X ** (a - r) * Y ** (b - order + r)
                )
    return sp.expand(result)


def target(N: int, d: int) -> sp.Poly:
    return sp.Poly(sp.expand(
        lower(p(N, X) * p(N, Y), d)
        - 2 * lower(p(N - 1, X) * p(N - 1, Y), d - 2)
        + lower(p(N - 2, X) * p(N - 2, Y), d - 4)
    ), X, Y, domain=sp.QQ)


def coefficient_matrix(poly: sp.Poly, width: int) -> fmpz_mat:
    return fmpz_mat(
        width,
        width,
        [int(poly.coeff_monomial(X**i * Y**j)) for i in range(width) for j in range(width)],
    )


def main() -> None:
    rng = random.Random(993_632_20260804)
    records = []
    failure = None
    for m in range(0, 10):
        N, d = 3 * m + 4, 2 * m + 5
        polynomial = target(N, d)
        matrix = coefficient_matrix(polynomial, N + 1)
        for trial in range(50):
            bases = [rng.randint(-79, 79), rng.randint(-79, 79)]
            directions = [rng.randint(1, 23), rng.randint(1, 23)]
            line = restrict_line(
                matrix, bases[0], directions[0], bases[1], directions[1]
            )
            real, gcd_degree, sturm_degrees = exact_distinct_real_roots(line)
            item = {
                "m": m,
                "N": N,
                "d": d,
                "trial": trial,
                "bases": bases,
                "directions": directions,
                "degree": line.degree(),
                "distinct_real_roots": real,
                "gcd_degree": gcd_degree,
                "digest": digest(line),
            }
            records.append(item)
            if real + gcd_degree != line.degree():
                item["sturm_degrees"] = sturm_degrees
                failure = item
                break
        if failure is not None:
            break

    report = {
        "status": "COUNTEREXAMPLE" if failure else "PASS_PROBE_ONLY",
        "test_count": len(records),
        "first_failure": failure,
        "records": records,
        "scope": "Exact affine-line Sturm probe; a clean run is not a proof.",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "test_count": len(records),
        "first_failure": failure,
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
