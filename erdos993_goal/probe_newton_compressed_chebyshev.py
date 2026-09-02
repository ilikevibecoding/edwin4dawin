#!/usr/bin/env python3
"""Check subset Wronskians of the compressed-factor row polynomials.

If F=U K J Tau^T J and

    psi_i(t)=sum_{k=i}^{q-1} F[i,k] t^(q-k),

then the full Newton-coordinate matrix is a beta-moment composition of the
psi_i with reversed monomials.  Reversing the psi order gives degrees in
increasing order.  Positivity of every subset Wronskian on (0,1) would make
this a Markov/Descartes system and provide the needed composition theorem.
"""

from itertools import combinations

import sympy as sp

from fast_bottom_forward import beta_coefficients, central_k, matmul
from probe_beta_newton_compressed_factor import reversal, transpose
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit
from probe_beta_newton_superballot_bridge import super_ballot


T = sp.symbols("t")


def compressed_factor(q):
    upper = matmul(
        inverse_lower_unit(beta_newton_lower(q)), beta_coefficients(q)
    )
    j = reversal(q)
    return matmul(
        matmul(matmul(matmul(upper, central_k(q + 1)), j),
               transpose(super_ballot(q))),
        j,
    )


def row_polynomials(q):
    factor = compressed_factor(q)
    psi = [
        sp.Poly(
            sum(
                sp.Rational(value.numerator, value.denominator) * T ** (q - k)
                for k, value in enumerate(row)
                if value
            ),
            T,
            domain=sp.QQ,
        )
        for row in factor
    ]
    return list(reversed(psi))


def wronskian(polynomials):
    order = len(polynomials)
    matrix = sp.Matrix(
        order,
        order,
        lambda row, column: sp.diff(polynomials[row].as_expr(), T, column),
    )
    return sp.Poly(matrix.det(method="domain-ge"), T, domain=sp.QQ)


def first_nonzero_coefficient(polynomial):
    return next(
        polynomial.nth(degree)
        for degree in range(polynomial.degree() + 1)
        if polynomial.nth(degree)
    )


def remove_zero_root(polynomial):
    valuation = next(
        degree
        for degree in range(polynomial.degree() + 1)
        if polynomial.nth(degree)
    )
    return sp.Poly(polynomial.as_expr() / T**valuation, T, domain=sp.QQ)


def main():
    for q in range(2, 9):
        polynomials = row_polynomials(q)
        tested = 0
        negative_at_zero = []
        interval_roots = []
        for order in range(1, q + 1):
            for indices in combinations(range(q), order):
                value = wronskian([polynomials[index] for index in indices])
                tested += 1
                initial = first_nonzero_coefficient(value)
                if initial < 0:
                    negative_at_zero.append((indices, value.degree()))
                roots = remove_zero_root(value).count_roots(0, 1)
                if roots:
                    interval_roots.append((indices, value.degree(), int(roots)))
                    break
            if interval_roots:
                break
        print(
            f"q={q} tested={tested} negative_initial={negative_at_zero[:3]} "
            f"interval_roots={interval_roots[:3]}"
        )
        if interval_roots:
            break


if __name__ == "__main__":
    main()
