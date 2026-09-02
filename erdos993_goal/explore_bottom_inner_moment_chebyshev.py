"""Test the inner polynomial Chebyshev system in the beta-moment lift.

Because beta_p(x)/D(x) is, up to a positive x-factor, the moment of
4^p t^p against t^x t^(5/2)(1-t)^(1/2) dt, the actual kernel sections are
moments of polynomials whose coefficient matrix is diag(4^p) K V.  If the
selected inner polynomials form a strict Chebyshev system on (0,1), total
positivity follows by composition with the strictly TP kernel t^x.
"""

from __future__ import annotations

import sympy as sp

from explore_bottom_forward_factor_components import components


T = sp.symbols("t")


def inner_polynomials(m: int) -> list[sp.Poly]:
    coefficients = components(m)["K*V"]
    return [
        sp.Poly(
            sum(4**power * coefficients[power, column] * T**power for power in range(coefficients.rows)),
            T,
        )
        for column in range(coefficients.cols)
    ]


def wronskian(polynomials: list[sp.Poly]) -> sp.Poly:
    order = len(polynomials)
    return sp.Poly(
        sp.factor(
            sp.Matrix(
                order,
                order,
                lambda derivative, column: sp.diff(
                    polynomials[column].as_expr(), T, derivative
                ),
            ).det(method="domain-ge")
        ),
        T,
    )


def main() -> None:
    for m in range(1, 9):
        polynomials = inner_polynomials(m)
        records = []
        for order in range(1, m + 1):
            for start in range(m - order + 1):
                value = wronskian(polynomials[start : start + order])
                roots = sp.polys.polytools.count_roots(value, 0, 1)
                sign = sp.sign(value.eval(sp.Rational(1, 2)))
                records.append((order, start, value.degree(), roots, sign))
        print(f"m={m} records={records}", flush=True)


if __name__ == "__main__":
    main()
