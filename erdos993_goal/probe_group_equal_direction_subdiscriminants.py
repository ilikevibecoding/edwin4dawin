#!/usr/bin/env python3
"""Probe the one-parameter real-stability reduction for the group target.

Raghavendra--Ryder--Srivastava's reduction says that a bivariate polynomial
P is real stable once

    x -> P(gamma+x, x)

is real-rooted for every real gamma and the leading homogeneous part is
positive on the positive projective interval.  The latter condition is
already proved for the group cone in Sections 88--90 of the main note.

For the symmetric group target it is cleaner to center the line:

    Q_c(x) = G(x+c, x-c).

Its coefficients, and its translation-invariant subdiscriminants, are
polynomials in a=c^2.  This script computes the leading principal minors of
the Hermite moment matrix of Q_c.  Positivity of all of them is equivalent
to Q_c having distinct real roots.  We record whether each certificate is a
polynomial in a with nonnegative coefficients and factor the first endpoint
cases exactly.

This is a discovery/replay probe.  Finite coefficient positivity is not an
all-order proof.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from verify_quadratic_component_square_root_lowering import X, Y, group


HERE = Path(__file__).resolve().parent
x, c, a = sp.symbols("x c a")


def power_sums(poly: sp.Poly) -> list[sp.Expr]:
    """Return root power sums s_0,...,s_(2n-2) by Newton identities."""
    n = poly.degree()
    lc = poly.LC()
    monic = sp.Poly(sp.expand(poly.as_expr() / lc), x)
    # coeff[j] is the coefficient of x^(n-j), with coeff[0]=1.
    coeff = [monic.nth(n - j) for j in range(n + 1)]
    sums: list[sp.Expr] = [sp.Integer(n)]
    for k in range(1, 2 * n - 1):
        upper = min(k - 1, n) if k <= n else n
        value = sum(coeff[j] * sums[k - j] for j in range(1, upper + 1))
        if k <= n:
            value += k * coeff[k]
        sums.append(sp.cancel(-value))
    return sums


def even_polynomial(expr: sp.Expr) -> sp.Poly:
    """Convert an even polynomial in c to a polynomial in a=c^2."""
    p = sp.Poly(sp.cancel(expr), c)
    out = sp.Integer(0)
    for (degree,), coefficient in p.terms():
        if degree % 2:
            raise AssertionError(f"odd c power {degree} in {expr}")
        out += coefficient * a ** (degree // 2)
    return sp.Poly(sp.expand(out), a)


def endpoint_record(m: int, include_factors: bool) -> dict:
    N = 3 * m + 4
    d = 2 * m + 5
    target = group(N, d)
    centered = sp.Poly(sp.expand(target.subs({X: x + c, Y: x - c})), x)
    degree = centered.degree()
    assert degree == 2 * N - d

    sums = power_sums(centered)
    records = []
    for size in range(1, degree + 1):
        matrix = sp.Matrix(size, size, lambda i, j: sums[i + j])
        determinant = sp.factor(matrix.det(method="domain-ge"))
        cert = even_polynomial(determinant)
        coefficients = cert.all_coeffs()
        nonnegative = bool(all(value >= 0 for value in coefficients))
        positive = bool(all(value > 0 for value in coefficients))
        positive_constant = bool(cert.nth(0) > 0)
        record = {
            "size": size,
            "degree_in_a": cert.degree(),
            "terms": len(cert.terms()),
            "all_coefficients_nonnegative": nonnegative,
            "all_coefficients_positive": positive,
            "constant_positive": positive_constant,
            "min_coefficient": str(min(coefficients)),
        }
        if include_factors:
            record["factorization"] = str(sp.factor(cert.as_expr()))
        records.append(record)
        if not (positive and positive_constant):
            raise AssertionError((m, size, cert.as_expr()))

    return {
        "m": m,
        "N": N,
        "d": d,
        "line_degree": degree,
        "subdiscriminants": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-m", type=int, default=1)
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "group_equal_direction_subdiscriminants_20260804.json",
    )
    args = parser.parse_args()

    endpoints = []
    for m in range(args.max_m + 1):
        endpoints.append(endpoint_record(m, include_factors=(m <= 1)))
        print(
            "passed m={m}, (N,d)=({N},{d}), degree={degree}".format(
                m=m,
                N=endpoints[-1]["N"],
                d=endpoints[-1]["d"],
                degree=endpoints[-1]["line_degree"],
            ),
            flush=True,
        )

    report = {
        "status": "PASS_FINITE_EQUAL_DIRECTION_SUBDISCRIMINANTS",
        "criterion": (
            "all leading Hermite moment minors of "
            "G_(N,d)(x+c,x-c) are coefficientwise positive in a=c^2"
        ),
        "theorem_scope": (
            "Together with positive top homogeneous part, the all-gamma "
            "version would imply bivariate real stability; this report is "
            "finite discovery evidence only."
        ),
        "endpoints": endpoints,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
