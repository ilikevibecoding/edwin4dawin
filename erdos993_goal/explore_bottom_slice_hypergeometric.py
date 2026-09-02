#!/usr/bin/env python3
"""Look for low-order hypergeometric ratios in homogeneous bottom slices."""

from __future__ import annotations

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


Y, Z = sp.symbols("Y Z")


def bottom_target(m: int) -> sp.Poly:
    N = 3*m+3
    d = 2*m+3
    g = sp.expand(hypergeometric_form(N, 3))
    h = sp.expand(hypergeometric_form(N-1, 3))
    expression = sum(
        sp.binomial(d, k)*sp.diff(g, X, k)*sp.diff(g, X, d-k).subs(X, Y)
        for k in range(d+1)
    ) - sum(
        sp.binomial(d-2, k)*sp.diff(h, X, k)*sp.diff(h, X, d-2-k).subs(X, Y)
        for k in range(d-1)
    )
    return sp.Poly(sp.expand(expression), X, Y)


def rational_ratio(coefficients: list[sp.Rational], max_degree: int = 6):
    ratios = [sp.cancel(coefficients[p+1]/coefficients[p]) for p in range(len(coefficients)-1)]
    p = sp.symbols("p")
    for total in range(1, 2*max_degree+1):
        for numerator_degree in range(max_degree+1):
            denominator_degree = total-numerator_degree
            if denominator_degree < 0 or denominator_degree > max_degree:
                continue
            aa = sp.symbols(f"a0:{numerator_degree+1}")
            bb = sp.symbols(f"b0:{denominator_degree}")
            numerator = sum(aa[i]*p**i for i in range(numerator_degree+1))
            denominator = p**denominator_degree + sum(
                bb[i]*p**i for i in range(denominator_degree)
            )
            equations = [
                sp.expand(numerator.subs(p, i)-ratios[i]*denominator.subs(p, i))
                for i in range(len(ratios))
            ]
            solution = sp.linsolve(equations, aa+bb)
            if solution is sp.EmptySet:
                continue
            tuples = list(solution)
            if len(tuples) != 1 or any(value.free_symbols for value in tuples[0]):
                continue
            candidate_numerator = sp.factor(numerator.subs(dict(zip(aa+bb, tuples[0]))))
            candidate_denominator = sp.factor(denominator.subs(dict(zip(aa+bb, tuples[0]))))
            if all(
                sp.cancel(candidate_numerator.subs(p, i)/candidate_denominator.subs(p, i)-ratios[i]) == 0
                for i in range(len(ratios))
            ):
                return numerator_degree, denominator_degree, candidate_numerator, candidate_denominator
    return None


def main() -> None:
    for m in range(1, 5):
        target = bottom_target(m)
        print("m", m)
        for total_degree in range(6, target.total_degree()+1):
            coefficients = [
                target.coeff_monomial(X**p*Y**(total_degree-p))
                for p in range(total_degree+1)
            ]
            first = next((i for i, c in enumerate(coefficients) if c), None)
            last = max(i for i, c in enumerate(coefficients) if c)
            support = coefficients[first:last+1]
            if len(support) < 8:
                continue
            fit = rational_ratio(support)
            print(" slice", total_degree, "support", [first, last], "fit", fit)


if __name__ == "__main__":
    main()
