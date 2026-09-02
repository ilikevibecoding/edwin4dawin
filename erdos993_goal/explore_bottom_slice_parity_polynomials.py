#!/usr/bin/env python3
"""Explore symmetric-coordinate parity polynomials of bottom slices.

For a symmetric homogeneous form H_t(X,Y), write
H_(2n)=(XY)^n E_n((X+Y)^2/(XY)) and
H_(2n+1)=(X+Y)(XY)^n O_n((X+Y)^2/(XY)).
The script checks roots, adjacent E/O interlacing, hypergeometric coefficient
ratios, and short recurrences.  It is exploratory route-selection code.
"""

from __future__ import annotations

import sympy as sp

from probe_bottom_homogenized_slice_chain import X, Y, bottom_target, homogeneous_slices


W = sp.symbols("W")


def symmetric_basis_coefficients(form: sp.Poly, degree: int) -> list[sp.Rational]:
    z = sp.symbols("z")
    univariate = sp.Poly(sp.expand(form.as_expr().subs({X: z, Y: 1})), z)
    width = degree // 2 + 1
    unknowns = sp.symbols(f"c0:{width}")
    expression = sum(
        unknowns[j] * z**j * (1 + z) ** (degree - 2 * j)
        for j in range(width)
    )
    equations = [
        sp.Eq(sp.Poly(expression, z).nth(k), univariate.nth(k))
        for k in range(degree + 1)
    ]
    solution = sp.solve(equations, unknowns, dict=True)
    assert len(solution) == 1
    return [sp.Rational(solution[0][value]) for value in unknowns]


def parity_polynomial(form: sp.Poly, degree: int) -> sp.Poly:
    coefficients = symmetric_basis_coefficients(form, degree)
    n = degree // 2
    return sp.Poly(sum(coefficients[j] * W ** (n - j) for j in range(n + 1)), W)


def roots_real_nonpositive(poly: sp.Poly) -> bool:
    intervals = sp.polys.polytools.intervals(poly, eps=sp.Rational(1, 10) ** 20)
    real_count = sum(mult for _, mult in intervals)
    if real_count != poly.degree():
        return False
    return all(interval[1] <= 0 for interval, _ in intervals)


def interlaces(first: sp.Poly, second: sp.Poly) -> bool:
    roots_first = sorted(float(sp.re(root)) for root in sp.nroots(first, maxsteps=200))
    roots_second = sorted(float(sp.re(root)) for root in sp.nroots(second, maxsteps=200))
    if any(abs(complex(root).imag) > 1e-9 for root in sp.nroots(first, maxsteps=200)):
        return False
    if any(abs(complex(root).imag) > 1e-9 for root in sp.nroots(second, maxsteps=200)):
        return False
    merged = sorted([(root, 0) for root in roots_first] + [(root, 1) for root in roots_second])
    return all(merged[j][1] != merged[j + 1][1] for j in range(len(merged) - 1))


def rational_ratio_fit(coefficients: list[sp.Rational], max_degree: int = 4):
    if len(coefficients) < 5 or any(value == 0 for value in coefficients[:-1]):
        return None
    ratios = [sp.cancel(coefficients[j + 1] / coefficients[j]) for j in range(len(coefficients) - 1)]
    jvar = sp.symbols("j")
    for numerator_degree in range(max_degree + 1):
        for denominator_degree in range(max_degree + 1):
            if numerator_degree + denominator_degree == 0:
                continue
            aa = sp.symbols(f"a0:{numerator_degree + 1}")
            bb = sp.symbols(f"b0:{denominator_degree}")
            numerator = sum(aa[k] * jvar**k for k in range(numerator_degree + 1))
            denominator = jvar**denominator_degree + sum(
                bb[k] * jvar**k for k in range(denominator_degree)
            )
            equations = [
                numerator.subs(jvar, k) - ratios[k] * denominator.subs(jvar, k)
                for k in range(len(ratios))
            ]
            solutions = list(sp.linsolve(equations, aa + bb))
            if len(solutions) != 1 or any(value.free_symbols for value in solutions[0]):
                continue
            substitution = dict(zip(aa + bb, solutions[0]))
            candidate_numerator = sp.factor(numerator.subs(substitution))
            candidate_denominator = sp.factor(denominator.subs(substitution))
            return (
                numerator_degree,
                denominator_degree,
                candidate_numerator,
                candidate_denominator,
            )
    return None


def recurrence_residual(sequence: list[sp.Poly], index: int, order: int):
    # Fit P_(n+1)=(W-beta)P_n-sum alpha_j P_(n-j) for a fixed bandwidth.
    current = sequence[index]
    following = sequence[index + 1]
    remainder = sp.Poly(following.as_expr() - W * current.as_expr(), W)
    coefficients = []
    beta = -remainder.coeff_monomial(W**index)
    coefficients.append(beta)
    remainder = sp.Poly(remainder.as_expr() + beta * current.as_expr(), W)
    for lag in range(1, order + 1):
        previous = sequence[index - lag]
        target_degree = previous.degree()
        alpha = -remainder.coeff_monomial(W**target_degree)
        coefficients.append(alpha)
        remainder = sp.Poly(remainder.as_expr() + alpha * previous.as_expr(), W)
    return coefficients, remainder


def main() -> None:
    for m in range(1, 6):
        slices = homogeneous_slices(bottom_target(m))
        parity = {degree: parity_polynomial(form, degree) for degree, form in slices.items()}
        even = [sp.Poly(parity[degree].as_expr() / parity[degree].LC(), W) for degree in sorted(parity) if degree % 2 == 0]
        odd = [sp.Poly(parity[degree].as_expr() / parity[degree].LC(), W) for degree in sorted(parity) if degree % 2 == 1]
        print(
            {
                "m": m,
                "all_parity_real_nonpositive": all(roots_real_nonpositive(poly) for poly in parity.values()),
                "same_index_even_odd_interlace": [
                    interlaces(even[index], odd[index])
                    for index in range(1, min(len(even), len(odd)))
                ],
                "coefficient_ratio_fits": {
                    degree: rational_ratio_fit([poly.nth(k) for k in range(poly.degree() + 1)])
                    for degree, poly in parity.items()
                    if poly.degree() >= 4
                },
            },
            flush=True,
        )
        for label, sequence in (("even", even), ("odd", odd)):
            failures = []
            for index in range(4, len(sequence) - 1):
                _, residual = recurrence_residual(sequence, index, 3)
                if not residual.is_zero:
                    failures.append((index, residual.degree()))
            print({"m": m, "parity": label, "four_term_failures": failures[:5]}, flush=True)


if __name__ == "__main__":
    main()
