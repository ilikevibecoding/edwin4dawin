"""Degree-cancelling elimination on the actual last-m polynomial family."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, maximal_tail_data


def eliminate(polynomials: list[sp.Poly]):
    levels = [polynomials]
    multipliers = []
    current = polynomials
    while len(current) > 1:
        next_level = []
        local = []
        for j in range(len(current) - 1):
            left = current[j]
            right = current[j + 1]
            mu = sp.factor(right.LC() / left.LC())
            # The observed ordering makes left*mu-right coefficient-positive
            # after the top coefficient cancels.
            reduced = sp.Poly(sp.factor(mu * left.as_expr() - right.as_expr()), X)
            local.append(mu)
            next_level.append(reduced)
        multipliers.append(local)
        levels.append(next_level)
        current = next_level
    return levels, multipliers


def main() -> None:
    for m in range(2, 8):
        d = 2 * m + 3
        selected = maximal_tail_data(d)[1][-m:]
        levels, multipliers = eliminate(selected)
        print(f"m={m}", flush=True)
        for stage, level in enumerate(levels):
            coefficient_positive = all(
                all(value > 0 for value in polynomial.all_coeffs())
                for polynomial in level
            )
            real_negative = True
            for polynomial in level:
                roots = sp.nroots(polynomial, n=30, maxsteps=500)
                real_negative &= all(
                    abs(complex(root).imag) < 1e-15 and complex(root).real < 0
                    for root in roots
                )
            print(
                f" stage={stage} count={len(level)} degree={level[0].degree()} "
                f"positive_coefficients={coefficient_positive} "
                f"real_negative_roots={real_negative}",
                flush=True,
            )
            if m <= 4:
                for polynomial in level:
                    print("  ", sp.factor(polynomial.as_expr()), flush=True)
        print(" multipliers=", multipliers, flush=True)


if __name__ == "__main__":
    main()
