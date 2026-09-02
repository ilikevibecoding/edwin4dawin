#!/usr/bin/env python3
"""Test stability of the unsmoothed positive colored-cycle endpoint core.

At the common factorial scale let

    F_N(X) = N! g_N(X).

The endpoint inclusion--exclusion core is

    C_N(X,Y) = F_N(X)F_N(Y)
      - 2 N^2 F_(N-1)(X)F_(N-1)(Y)
      + N^2(N-1)^2 F_(N-2)(X)F_(N-2)(Y).

It has a positive colored-cycle interpretation, but positivity of its
coefficients does not imply real stability.  This exact Sturm probe decides
whether the tempting stronger statement C_N stable can survive even at the
first few sizes.
"""

from __future__ import annotations

import hashlib
import json
import random
from math import comb, factorial
from pathlib import Path

import sympy as sp

from flint import fmpz_mat

from fast_group_line_sturm_search import (
    digest as flint_digest,
    exact_distinct_real_roots,
    restrict_line,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "colored_cycle_core_stability_probe_20260804.json"
X, Y, tau = sp.symbols("X Y tau")


def F(N: int, variable: sp.Symbol) -> sp.Expr:
    if N < 0:
        return sp.S.Zero
    return sp.Add(*[
        sp.Integer(factorial(N) * comb(N + k - 1, N - k))
        * variable**k / factorial(k)
        for k in range(N + 1)
    ])


def core(N: int) -> sp.Poly:
    expression = (
        F(N, X) * F(N, Y)
        - 2 * N**2 * F(N - 1, X) * F(N - 1, Y)
        + N**2 * (N - 1)**2 * F(N - 2, X) * F(N - 2, Y)
    )
    return sp.Poly(sp.expand(expression), X, Y, domain=sp.QQ)


def coefficient_matrix(poly: sp.Poly, width: int) -> fmpz_mat:
    return fmpz_mat(
        width,
        width,
        [int(poly.coeff_monomial(X**i * Y**j)) for i in range(width) for j in range(width)],
    )


def main() -> None:
    rng = random.Random(993_618_20260804)
    records: list[dict[str, object]] = []
    first_failure = None
    for N in range(3, 14):
        polynomial = core(N)
        matrix = coefficient_matrix(polynomial, N + 1)
        coefficient_nonnegative = all(
            coefficient >= 0 for coefficient in polynomial.coeffs()
        )
        for trial in range(30):
            bases = [rng.randint(-31, 31), rng.randint(-31, 31)]
            directions = [rng.randint(1, 17), rng.randint(1, 17)]
            line = restrict_line(
                matrix, bases[0], directions[0], bases[1], directions[1]
            )
            real, gcd_degree, _ = exact_distinct_real_roots(line)
            item = {
                "N": N,
                "trial": trial,
                "coefficientwise_nonnegative": coefficient_nonnegative,
                "bases": bases,
                "directions": directions,
                "degree": line.degree(),
                "distinct_real_roots": real,
                "gcd_degree": gcd_degree,
                "digest": flint_digest(line),
            }
            records.append(item)
            if real + gcd_degree != line.degree():
                first_failure = item
                break
        if first_failure is not None:
            break

    report = {
        "status": "COUNTEREXAMPLE" if first_failure else "PASS_PROBE_ONLY",
        "tests": records,
        "first_failure": first_failure,
        "scope": "Exact affine-line Sturm probe; not a proof of stability.",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "test_count": len(records),
        "first_failure": first_failure,
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
