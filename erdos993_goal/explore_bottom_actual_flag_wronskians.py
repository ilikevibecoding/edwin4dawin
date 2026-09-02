"""Audit Wronskians of the actual consecutive kernel-section flags.

Karp's flag criterion turns positivity of coefficient Pluecker coordinates
into nonvanishing of the flag Wronskians on [0,infinity].  This script checks
the stronger positive-coefficient/negative-root pattern for every consecutive
block of selected balanced sections.
"""

from __future__ import annotations

import numpy as np
import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, maximal_tail_data


def wronskian(polynomials: list[sp.Poly]) -> sp.Poly:
    k = len(polynomials)
    matrix = sp.Matrix(
        k,
        k,
        lambda derivative, column: sp.diff(
            polynomials[column].as_expr(), X, derivative
        ),
    )
    return sp.Poly(sp.factor(matrix.det(method="domain-ge")), X)


def numerical_root_summary(polynomial: sp.Poly):
    coefficients = np.array([float(value) for value in polynomial.all_coeffs()])
    coefficients /= np.max(np.abs(coefficients))
    roots = np.roots(coefficients)
    return (
        float(np.max(np.abs(roots.imag))),
        float(np.min(roots.real)),
        float(np.max(roots.real)),
    )


def main() -> None:
    for m in range(2, 7):
        selected = maximal_tail_data(2 * m + 3)[1][-m:]
        records = []
        for order in range(1, m + 1):
            for start in range(m - order + 1):
                value = wronskian(selected[start : start + order])
                positive_coefficients = all(coefficient > 0 for coefficient in value.all_coeffs())
                roots = numerical_root_summary(value) if value.degree() <= 35 else None
                records.append((order, start, value.degree(), positive_coefficients, roots))
        print(f"m={m} records={records}", flush=True)


if __name__ == "__main__":
    main()
