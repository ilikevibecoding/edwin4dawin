#!/usr/bin/env python3
"""Exact line probe of the 21 outer-M components in quadratic coordinates.

The exact coordinate identity is

  G=B_N[L^(d-4) M^2],

where B_N extracts against
(1+t)^(N-3)(1+s)^(N-3) exp(Xt(1+t)+Ys(1+s)).  Expanding one copy of the
21-term positive polynomial M gives components

  B_N[t^i s^j L^(d-4) M].

If these components were individually stable and compatible, their positive
sum would give a promising composition route.  This script performs exact
positive-direction Sturm tests to decide the first, necessary part.  Clean
finite tests are evidence only; any nonreal-rooted restriction is an exact
obstruction to the componentwise route.
"""

from __future__ import annotations

import argparse
import json
import random
from math import factorial
from pathlib import Path

import sympy as sp
from flint import fmpz_mat

from fast_group_line_sturm_search import (
    digest,
    exact_distinct_real_roots,
    restrict_line,
)


HERE = Path(__file__).resolve().parent
X, Y, t, s = sp.symbols("X Y t s")


def truncate(expr: sp.Expr, variable: sp.Symbol, degree: int) -> sp.Expr:
    return sp.series(expr, variable, 0, degree + 1).removeO().expand()


def seed_coefficients(N: int, variable: sp.Symbol, series_var: sp.Symbol):
    a = series_var * (1 + series_var)
    exponential = sum(
        variable**j * a**j / factorial(j) for j in range(N + 1)
    )
    polynomial = sp.Poly(
        truncate((1 + series_var) ** (N - 3) * exponential, series_var, N),
        series_var,
    )
    return [polynomial.coeff_monomial(series_var**j) for j in range(N + 1)]


def component_polynomial(
    N: int,
    d: int,
    outer_exponents: tuple[int, int],
    seeds_x: list[sp.Expr],
    seeds_y: list[sp.Expr],
) -> sp.Poly:
    a = t * (1 + t)
    b = s * (1 + s)
    L = a + b
    M = sp.expand((1 + t) * (1 + s) * L**2 - t * s)
    i, j = outer_exponents
    kernel = sp.Poly(
        sp.expand(t**i * s**j * L ** (d - 4) * M),
        t,
        s,
        domain=sp.ZZ,
    )
    answer = sp.S.Zero
    for (left, right), coefficient in kernel.terms():
        if left <= N and right <= N:
            answer += coefficient * seeds_x[N - left] * seeds_y[N - right]
    return sp.Poly(sp.expand(answer), X, Y, domain=sp.QQ)


def integer_matrix(poly: sp.Poly, width: int) -> fmpz_mat:
    denominators = [sp.denom(value) for value in poly.coeffs()]
    scale = sp.ilcm(*denominators) if denominators else 1
    return fmpz_mat(
        width,
        width,
        [int(poly.coeff_monomial(X**i * Y**j) * scale)
         for i in range(width) for j in range(width)],
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cells", default="7:7,8:7,9:7")
    parser.add_argument("--trials", type=int, default=60)
    parser.add_argument("--bound", type=int, default=300)
    parser.add_argument("--seed", type=int, default=993_607_20260804)
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "quadratic_kernel_monomial_components_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)

    a = t * (1 + t)
    b = s * (1 + s)
    L = a + b
    M = sp.Poly(sp.expand((1 + t) * (1 + s) * L**2 - t * s), t, s)
    outer_terms = sorted([monomial for monomial, _ in M.terms()])
    assert len(outer_terms) == 21

    records = []
    first_failure = None
    for cell in args.cells.split(","):
        N, d = (int(value) for value in cell.split(":"))
        seeds_x = seed_coefficients(N, X, t)
        seeds_y = seed_coefficients(N, Y, s)
        for outer in outer_terms:
            poly = component_polynomial(N, d, outer, seeds_x, seeds_y)
            matrix = integer_matrix(poly, N + 1)
            component_record = {
                "N": N,
                "d": d,
                "outer_monomial": list(outer),
                "polynomial_total_degree": poly.total_degree(),
                "terms": len(poly.terms()),
                "lines_tested": 0,
                "status": None,
                "failure": None,
            }
            for trial in range(args.trials):
                ax = rng.randint(-args.bound, args.bound)
                ay = rng.randint(-args.bound, args.bound)
                bx = rng.randint(1, 31)
                by = rng.randint(1, 31)
                line = restrict_line(matrix, ax, bx, ay, by)
                real, gcd_degree, sturm_degrees = exact_distinct_real_roots(line)
                component_record["lines_tested"] += 1
                if real + gcd_degree != line.degree():
                    failure = {
                        "trial": trial,
                        "line": [ax, bx, ay, by],
                        "degree": line.degree(),
                        "distinct_real_roots": real,
                        "gcd_degree": gcd_degree,
                        "sturm_degrees": sturm_degrees,
                        "sha256": digest(line),
                    }
                    component_record["failure"] = failure
                    component_record["status"] = "EXACT_LINE_FAILURE"
                    if first_failure is None:
                        first_failure = {**component_record}
                    break
            if component_record["status"] is None:
                component_record["status"] = "CLEAN_FINITE_EXACT_LINES"
            records.append(component_record)
            print(
                f"N={N} d={d} outer={outer}: {component_record['status']} "
                f"({component_record['lines_tested']} lines)",
                flush=True,
            )

    report = {
        "status": (
            "COMPONENTWISE_STABILITY_ROUTE_OBSTRUCTED"
            if first_failure
            else "FINITE_COMPONENT_SCREEN_CLEAN"
        ),
        "coordinate_identity": "G=B_N[L^(d-4)M^2]",
        "component_family": "B_N[t^i s^j L^(d-4)M] for monomials of M",
        "parameters": vars(args) | {"out": str(args.out)},
        "outer_monomial_count": len(outer_terms),
        "component_count": len(records),
        "line_count": sum(record["lines_tested"] for record in records),
        "first_failure": first_failure,
        "records": records,
        "scope": (
            "An exact line failure rigorously disproves stability of that "
            "component.  Clean line tests are finite evidence only."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
