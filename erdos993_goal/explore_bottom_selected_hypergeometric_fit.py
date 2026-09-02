"""Test whether actual kernel sections are low-order hypergeometric polynomials."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import maximal_tail_data


K = sp.symbols("k")


def fit_ratio(polynomial: sp.Poly, maximum_total_degree: int = 10):
    coefficients = [polynomial.nth(index) for index in range(polynomial.degree() + 1)]
    data = [
        (index, sp.cancel(coefficients[index + 1] / coefficients[index]))
        for index in range(len(coefficients) - 1)
    ]
    # Keep at least three exact holdout points.
    for used in range(5, len(data) - 2):
        train = data[:used]
        test = data[used:]
        for numerator_degree in range(used):
            denominator_degree = used - numerator_degree - 1
            if numerator_degree + denominator_degree > maximum_total_degree:
                continue
            candidate = sp.factor(sp.rational_interpolate(train, numerator_degree, K))
            if all(sp.cancel(candidate.subs(K, x) - y) == 0 for x, y in test):
                return numerator_degree, denominator_degree, candidate
    return None


def main() -> None:
    for m in range(3, 11):
        d = 2 * m + 3
        selected = maximal_tail_data(d)[1][-m:]
        fits = [fit_ratio(polynomial) for polynomial in selected]
        print(f"m={m} fits={fits}", flush=True)


if __name__ == "__main__":
    main()
