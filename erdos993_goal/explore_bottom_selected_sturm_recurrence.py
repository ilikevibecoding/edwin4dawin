"""Test a three-term Sturm recurrence in the degree-cancelled flag basis."""

from __future__ import annotations

import sympy as sp

from explore_bottom_selected_polynomial_elimination import eliminate
from verify_bottom_schur_chebyshev_coefficients import X, maximal_tail_data


def recurrence(first: sp.Poly, second: sp.Poly, third: sp.Poly):
    """Fit first=(a*x+b)*second+c*third using the top three coefficients."""
    r = first.degree()
    assert second.degree() == r - 1 and third.degree() == r - 2
    a = sp.factor(first.nth(r) / second.nth(r - 1))
    b = sp.factor(
        (first.nth(r - 1) - a * second.nth(r - 2)) / second.nth(r - 1)
    )
    c = sp.factor(
        (
            first.nth(r - 2)
            - a * second.nth(r - 3)
            - b * second.nth(r - 2)
        )
        / third.nth(r - 2)
    )
    residual = sp.Poly(
        sp.factor(first.as_expr() - (a * X + b) * second.as_expr() - c * third.as_expr()),
        X,
    )
    return a, b, c, residual


def four_term(
    first: sp.Poly, second: sp.Poly, third: sp.Poly, fourth: sp.Poly
):
    """Fit first=(a*x+b)*second+c*third+e*fourth from the top four terms."""
    a, b, c, residual = recurrence(first, second, third)
    r = first.degree()
    assert fourth.degree() == r - 3
    e = sp.factor(residual.nth(r - 3) / fourth.nth(r - 3))
    final = sp.Poly(sp.factor(residual.as_expr() - e * fourth.as_expr()), X)
    return a, b, c, e, final


def interlaces(high: sp.Poly, low: sp.Poly) -> bool:
    high_roots = sorted(float(sp.re(root)) for root in sp.nroots(high, n=40))
    low_roots = sorted(float(sp.re(root)) for root in sp.nroots(low, n=40))
    return all(
        high_roots[i] < low_roots[i] < high_roots[i + 1]
        for i in range(len(low_roots))
    )


def main() -> None:
    for m in range(2, 9):
        selected = maximal_tail_data(2 * m + 3)[1][-m:]
        levels, _ = eliminate(selected)
        flag = [level[0] for level in levels]
        print(
            f"m={m} degrees={[polynomial.degree() for polynomial in flag]} "
            f"consecutive_interlacing={[interlaces(flag[i], flag[i+1]) for i in range(len(flag)-1)]}",
            flush=True,
        )
        for stage in range(len(flag) - 2):
            a, b, c, residual = recurrence(flag[stage], flag[stage + 1], flag[stage + 2])
            print(
                f" stage={stage} a={a} b={b} c={c} "
                f"exact={residual.is_zero} residual_degree={residual.degree()}",
                flush=True,
            )
        for stage in range(len(flag) - 3):
            a, b, c, e, residual = four_term(
                flag[stage], flag[stage + 1], flag[stage + 2], flag[stage + 3]
            )
            print(
                f" four_stage={stage} signs={(sp.sign(a),sp.sign(b),sp.sign(c),sp.sign(e))} "
                f"exact={residual.is_zero} residual_degree={residual.degree()}",
                flush=True,
            )


if __name__ == "__main__":
    main()
