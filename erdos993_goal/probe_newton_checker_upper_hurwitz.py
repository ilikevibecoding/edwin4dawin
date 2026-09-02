#!/usr/bin/env python3
"""Check exact Hurwitz determinants and size recurrences of hard upper rows."""

import sympy as sp

from probe_newton_checker_upper_rows import row_polynomials


x = sp.symbols("x")


def hurwitz_matrix(polynomial):
    degree = polynomial.degree()
    # Coefficients a_0,...,a_n in descending-power convention:
    # p(x)=a_0*x^n+a_1*x^(n-1)+...+a_n.
    coefficients = polynomial.all_coeffs()
    out = sp.zeros(degree, degree)
    for i in range(degree):
        for j in range(degree):
            index = 2 * j - i + 1
            if 0 <= index <= degree:
                out[i, j] = coefficients[index]
    return out


def hurwitz_minors(polynomial):
    matrix = hurwitz_matrix(polynomial)
    return [sp.factor(matrix[:k, :k].det()) for k in range(1, matrix.rows + 1)]


def affine_three_term(current, previous, before_previous):
    """Solve current=(a*x+b)*previous+c*before_previous if possible."""
    a, b, c = sp.symbols("a b c")
    expression = sp.Poly(
        current.as_expr()
        - (a * x + b) * previous.as_expr()
        - c * before_previous.as_expr(),
        x,
    )
    solution = sp.solve(expression.all_coeffs(), (a, b, c), dict=True)
    return solution


def main():
    tops = {}
    for q in range(2, 13):
        rows = row_polynomials(q)
        tops[q] = rows[0].monic()
        checks = 0
        for i, polynomial in enumerate(rows):
            if polynomial.degree() <= 0:
                continue
            minors = hurwitz_minors(polynomial)
            if not all(value > 0 for value in minors):
                print(f"q={q} row={i} FAIL minors={minors}")
                return
            checks += len(minors)
        recurrence = None
        if q >= 4:
            recurrence = affine_three_term(tops[q], tops[q - 1], tops[q - 2])
        print(f"q={q} PASS hurwitz_checks={checks} recurrence={recurrence}")


if __name__ == "__main__":
    main()
