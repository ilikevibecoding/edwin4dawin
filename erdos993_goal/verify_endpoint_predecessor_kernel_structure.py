#!/usr/bin/env python3
"""Exact structural checks for the defect-three predecessor kernel.

For D(E)=E/(1-E)^2 put A(i,r)=[E^i]D(E)^r.  The bottom
endpoint

    F_(N,d)=S^d(g_N(X)g_N(Y))-S^(d-2)(g_(N-1)(X)g_(N-1)(Y))

has the predecessor expansion

    F_(N,d)=sum_(i,j) C_d(i,j)
              Phi(D_X)^i g_N(X) Phi(D_Y)^j g_N(Y),

where C_d is the coefficient matrix of

    (D(E)+D(F))^(d-2) ((D(E)+D(F))^2-EF).

This script verifies the expansion, certifies reverse total
nonnegativity in the first complete cases, and records an exact warning:
the truncated coefficient kernel itself is not real stable.  The warning
prevents reverse sign-regularity from being mistaken for the missing
endpoint theorem.
"""

from __future__ import annotations

import itertools
import json
import math
from pathlib import Path

import sympy as sp


X, Y, q = sp.symbols("X Y q")
OUT = Path("endpoint_predecessor_kernel_structure_20260802.json")


def seed(N: int, variable: sp.Symbol) -> sp.Expr:
    if N < 2:
        return sp.S.Zero
    return sp.expand(
        sum(
            sp.binomial(N + k - 3, N - k)
            * variable**k
            / sp.factorial(k)
            for k in range(2, N + 1)
        )
    )


def predecessor_coefficient(i: int, r: int) -> int:
    if i < 0:
        return 0
    if r == 0:
        return int(i == 0)
    if i < r:
        return 0
    return math.comb(i + r - 1, i - r)


def kernel_matrix(N: int, d: int) -> sp.Matrix:
    # Phi(D) lowers degree, so its chain on a degree-N seed has N+1
    # possibly nonzero members (including the constant endpoint).
    size = N + 1
    return sp.Matrix(
        [
            [
                sum(
                    math.comb(d, r)
                    * predecessor_coefficient(i, r)
                    * predecessor_coefficient(j, d - r)
                    for r in range(d + 1)
                )
                - sum(
                    math.comb(d - 2, r)
                    * predecessor_coefficient(i - 1, r)
                    * predecessor_coefficient(j - 1, d - 2 - r)
                    for r in range(d - 1)
                )
                for j in range(size)
            ]
            for i in range(size)
        ]
    )


def derivative_sum_product(N: int, d: int) -> sp.Expr:
    gx = seed(N, X)
    gy = seed(N, Y)
    return sp.expand(
        sum(
            sp.binomial(d, r)
            * sp.diff(gx, X, r)
            * sp.diff(gy, Y, d - r)
            for r in range(d + 1)
        )
    )


def predecessor_expansion(N: int, d: int) -> sp.Expr:
    matrix = kernel_matrix(N, d)
    atoms_x = catalan_chain(seed(N, X), X)
    atoms_y = catalan_chain(seed(N, Y), Y)
    return sp.expand(
        sum(
            matrix[i, j] * atoms_x[i] * atoms_y[j]
            for i in range(N + 1)
            for j in range(N + 1)
        )
    )


def phi_apply(poly: sp.Expr, variable: sp.Symbol) -> sp.Expr:
    degree = sp.degree(poly, variable)
    if degree <= 0:
        return sp.S.Zero
    return sp.expand(
        sum(
            (-1) ** (j - 1)
            * sp.catalan(j)
            * sp.diff(poly, variable, j)
            for j in range(1, degree + 1)
        )
    )


def catalan_chain(poly: sp.Expr, variable: sp.Symbol) -> list[sp.Expr]:
    degree = sp.degree(poly, variable)
    atoms = [sp.expand(poly)]
    for _ in range(degree):
        atoms.append(phi_apply(atoms[-1], variable))
    return atoms


def exhaustive_minor_counts(matrix: sp.Matrix) -> list[dict[str, int]]:
    records = []
    for order in range(1, min(matrix.rows, matrix.cols) + 1):
        positive = negative = zero = 0
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                determinant = matrix.extract(rows, columns).det()
                if determinant > 0:
                    positive += 1
                elif determinant < 0:
                    negative += 1
                else:
                    zero += 1
        records.append(
            {
                "order": order,
                "positive": positive,
                "negative": negative,
                "zero": zero,
            }
        )
    return records


def primitive_integer_coefficients(poly: sp.Poly) -> list[int]:
    rational = [sp.Rational(poly.nth(k)) for k in range(poly.degree() + 1)]
    denominator = sp.ilcm(*[value.q for value in rational])
    integers = [int(value * denominator) for value in rational]
    divisor = abs(math.gcd(*integers))
    return [value // divisor for value in integers]


def main() -> None:
    derivative_checks = 0
    for N in range(2, 19):
        atoms = catalan_chain(seed(N, X), X)
        for r in range(N + 1):
            lhs = sp.diff(seed(N, X), X, r)
            rhs = sum(
                predecessor_coefficient(i, r) * atoms[i]
                for i in range(N + 1)
            )
            assert sp.expand(lhs - rhs) == 0
            derivative_checks += 1

    expansion_cases = []
    for m in range(1, 7):
        N = 3 * m + 3
        d = 2 * m + 3
        direct = sp.expand(
            derivative_sum_product(N, d)
            - derivative_sum_product(N - 1, d - 2)
        )
        expanded = predecessor_expansion(N, d)
        assert sp.expand(direct - expanded) == 0
        expansion_cases.append({"m": m, "N": N, "d": d})

    # Reversing the columns converts the observed sign-regular matrix into
    # a totally nonnegative one.  Check every minor in the first two full
    # endpoint cases, not merely adjacent minors.
    minor_certificates = []
    for N, d in ((6, 5), (9, 7)):
        reversed_matrix = kernel_matrix(N, d)[:, ::-1]
        counts = exhaustive_minor_counts(reversed_matrix)
        assert all(record["negative"] == 0 for record in counts)
        minor_certificates.append(
            {
                "N": N,
                "d": d,
                "matrix_size": N + 1,
                "minor_counts": counts,
            }
        )

    # The smaller sufficient-threshold candidate at N=6 is d=4.  Its
    # truncated kernel already fails stability on the exact line below.
    N = 6
    d = 4
    matrix = kernel_matrix(N, d)
    kernel = sp.expand(
        sum(
            matrix[i, j] * X**i * Y**j
            for i in range(N + 1)
            for j in range(N + 1)
        )
    )
    line = sp.Poly(sp.expand(kernel.subs({X: -7 + 4 * q, Y: 7 + 4 * q})), q)
    primitive = primitive_integer_coefficients(line)
    primitive_poly = sp.Poly(
        sum(value * q**k for k, value in enumerate(primitive)), q
    )
    assert primitive_poly.degree() == 12
    assert sp.gcd(primitive_poly, primitive_poly.diff()).degree() == 0
    real_roots = int(primitive_poly.count_roots(-sp.oo, sp.oo))
    assert real_roots == 0
    intervals = [
        {
            "left": str(interval[0]),
            "right": str(interval[1]),
            "multiplicity": multiplicity,
        }
        for interval, multiplicity in primitive_poly.intervals(
            eps=sp.Rational(1, 10) ** 10
        )
    ]

    lowest_total_part = sp.expand(
        sum(
            matrix[i, j] * X**i * Y**j
            for i in range(N + 1)
            for j in range(N + 1)
            if i + j == d
        )
    )
    expected_lowest = sp.expand((X + Y) ** (d - 2) * (X**2 + X * Y + Y**2))
    assert sp.expand(lowest_total_part - expected_lowest) == 0

    report = {
        "kind": "endpoint_predecessor_kernel_structure",
        "date": "2026-08-02",
        "status": "PASS_IDENTITIES_AND_EXACT_KERNEL_NONSTABILITY_WARNING",
        "predecessor_series": "D(E)=E/(1-E)^2",
        "predecessor_coefficient": (
            "[E^i]D(E)^r = delta_(i,0) for r=0; "
            "binomial(i+r-1,i-r) for r>=1 and i>=r"
        ),
        "derivative_identity": (
            "g_N^(r)=sum_(i=0)^N [E^i]D(E)^r Phi(D)^i g_N"
        ),
        "derivative_identity_checks": derivative_checks,
        "endpoint_expansion_cases": expansion_cases,
        "kernel": (
            "(D(E)+D(F))^(d-2)*((D(E)+D(F))^2-EF)"
        ),
        "reverse_total_nonnegative_certificates": minor_certificates,
        "kernel_nonstability_witness": {
            "N": N,
            "d": d,
            "line": {"X": "-7+4q", "Y": "7+4q"},
            "primitive_integer_coefficients_ascending": primitive,
            "degree": primitive_poly.degree(),
            "squarefree": True,
            "exact_real_root_count": real_roots,
            "nonreal_root_count": primitive_poly.degree() - real_roots,
            "real_root_isolating_intervals": intervals,
            "lowest_total_homogeneous_part": str(expected_lowest),
        },
        "scope_warning": (
            "This counterexample concerns only the truncated coefficient "
            "kernel in the predecessor variables.  It is not a counterexample "
            "to the composed endpoint A-B or to Erdos Problem 993."
        ),
        "conclusion": (
            "The predecessor kernel is reverse totally nonnegative in the "
            "complete checked cases, but that property does not imply its "
            "real stability.  Any proof must use the special composed "
            "Laguerre/Jacobi predecessor family, not the kernel alone."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "derivative_identity_checks": derivative_checks,
                "endpoint_expansion_checks": len(expansion_cases),
                "kernel_nonreal_root_count": primitive_poly.degree() - real_roots,
                "output": str(OUT.resolve()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
