#!/usr/bin/env python3
"""Exact replay for the all-order local-Poincare deficit bound.

Put

    F_h(y,s) = [u^h] exp(sum_(n>=1) x_n u^n/n),
    x_n = y(2-d_n)/3 + s(1-2d_n)/3,
    d_n = binom(2n,n)/4^n.

The all-order proof normalizes x_n by x_1 and x_2.  If

    q=x_2/x_1, C_n=x_n/(x_1 q^(n-1)), a=x_1/q,

then C_1=C_2=1 and C is log-concave.  The coefficient becomes

    F_h=q^h P_h(a),
    P_h(a)=[z^h] exp(a sum C_n z^n/n).

For the weighted-permutation ratio R_h=h P_h/P_(h-1), insertion gives
R_h=a+E H, where H=sum over cycles |gamma| C_(|gamma|+1)/C_|gamma|.
A TP2 argument for the partial Bell array proves Cov(H,K)>=0, where K is
the number of cycles.  Hence R_h-a R_h'<=h-1.  This yields

    (delta_h-delta_(h-1))/(h-1) <= 7/(3y)

whenever y>=4s (and therefore throughout y>=4s+12).

The proof is all-order.  This script replays its algebra, Toeplitz/partial-
Bell TP2 minors, conditional insertion monotonicity, covariance inequality,
and final deficit inequality on an exact rational grid.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "local_poincare_deficit_bound_exact_20260810.json"


def central(n: int) -> Fraction:
    return Fraction(math.comb(2 * n, n), 4**n)


def input_weight(n: int, y: Fraction, s: Fraction) -> Fraction:
    d = central(n)
    return y * (2 - d) / 3 + s * (1 - 2 * d) / 3


def symbolic_identities() -> int:
    n, y, s, d = sp.symbols("n y s d", positive=True)
    previous = d * 2 * n / (2 * n - 1)
    following = d * (2 * n + 1) / (2 * n + 2)
    big_a = 2 * y + s
    big_b = y + 2 * s
    x = lambda value: (big_a - big_b * value) / 3
    minor = sp.factor(x(d) ** 2 - x(previous) * x(following))
    expected = (
        big_b
        * d
        * (3 * big_a - 2 * big_b * d)
        / (18 * (n + 1) * (2 * n - 1))
    )
    assert sp.factor(minor - expected) == 0

    q = sp.Rational(13, 12) + s / (6 * y)
    assert sp.factor(q - ((sp.Rational(13, 24) * y + s / 12) / (y / 2))) == 0
    assert sp.factor(q - y * sp.diff(q, y) - (sp.Rational(13, 12) + s / (3 * y))) == 0
    a = y / (2 * q)
    assert sp.factor(y * q * sp.diff(a, y) - a * (q - y * sp.diff(q, y))) == 0

    tau, alpha_n, beta_n = sp.symbols("tau alpha_n beta_n", nonnegative=True)
    shape_numerator = sp.expand(
        beta_n * (sp.Rational(13, 2) + tau)
        - (n - 1) * (alpha_n + tau * beta_n)
    )
    expected_shape = sp.expand(
        sp.Rational(13, 2) * beta_n
        - (n - 1) * alpha_n
        - (n - 2) * tau * beta_n
    )
    assert shape_numerator == expected_shape
    return 5


def partial_bell(normalized: list[Fraction], limit: int) -> list[list[Fraction]]:
    """e[n][k]=[z^n](sum C_l z^l/l)^k/k!, via n e[n,k]=sum C_l e[n-l,k-1]."""
    e = [[Fraction(0) for _ in range(limit + 1)] for _ in range(limit + 1)]
    e[0][0] = Fraction(1)
    for k in range(1, limit + 1):
        for n in range(k, limit + 1):
            e[n][k] = sum(
                normalized[ell] * e[n - ell][k - 1]
                for ell in range(1, n + 1)
            ) / n
    return e


def polynomial_value(coefficients: list[Fraction], a: Fraction) -> Fraction:
    return sum(value * a**k for k, value in enumerate(coefficients))


def polynomial_derivative_value(
    coefficients: list[Fraction], a: Fraction
) -> Fraction:
    return sum(k * value * a ** (k - 1) for k, value in enumerate(coefficients) if k)


def one_case(max_h: int, y_value: int, s_value: int) -> dict[str, object]:
    y = Fraction(y_value)
    s = Fraction(s_value)
    x = [Fraction(0)] + [input_weight(n, y, s) for n in range(1, max_h + 2)]
    q = x[2] / x[1]
    normalized = [Fraction(0)] + [
        x[n] / (x[1] * q ** (n - 1)) for n in range(1, max_h + 2)
    ]
    assert normalized[1] == normalized[2] == 1

    input_minors = 0
    normalized_minors = 0
    for n in range(2, max_h + 1):
        assert x[n] ** 2 > x[n - 1] * x[n + 1]
        assert normalized[n] ** 2 > normalized[n - 1] * normalized[n + 1]
        input_minors += 1
        normalized_minors += 1
    ratios = [normalized[n + 1] / normalized[n] for n in range(1, max_h + 1)]
    assert ratios[0] == 1
    assert all(ratios[i] >= ratios[i + 1] for i in range(len(ratios) - 1))

    # At fixed s, C_n is nondecreasing in y.  Equivalently C_n decreases
    # in tau=s/y.  C_1 and C_2 are identically one.
    q_y = -s / (6 * y**2)
    normalized_y = [Fraction(0) for _ in range(max_h + 2)]
    shape_monotonicities = 0
    for n in range(1, max_h + 2):
        alpha_n = (2 - central(n)) / 3
        normalized_y[n] = normalized[n] * (
            alpha_n / x[n] - Fraction(1, 1) / y - (n - 1) * q_y / q
        )
        assert normalized_y[n] >= 0
        if n <= 2:
            assert normalized_y[n] == 0
        else:
            shape_monotonicities += 1

    e = partial_bell(normalized, max_h + 1)

    partial_bell_recursions = 0
    for k in range(1, max_h + 1):
        for n in range(k, max_h + 1):
            left = n * e[n][k]
            right = sum(
                normalized[ell] * e[n - ell][k - 1]
                for ell in range(1, n + 1)
            )
            assert left == right
            partial_bell_recursions += 1

    # Adjacent-column TP2.  This is the finite replay of
    # [e_(.,k-1),e_(.,k)] = A^k [e_(.,0),e_(.,1)].
    tp2_minors = 0
    strict_tp2_minors = 0
    for k in range(1, max_h + 1):
        for n1 in range(0, max_h):
            for n2 in range(n1 + 1, max_h + 1):
                determinant = (
                    e[n1][k - 1] * e[n2][k]
                    - e[n1][k] * e[n2][k - 1]
                )
                assert determinant >= 0
                tp2_minors += 1
                strict_tp2_minors += determinant > 0

    conditional_monotonicities = 0
    covariance_checks = 0
    insertion_identities = 0
    ratio_concavity_checks = 0
    ratio_shape_derivatives = 0
    a_values = [Fraction(1, 3), Fraction(1), Fraction(7, 2), x[1] / q]
    for n in range(1, max_h):
        conditional_h: list[Fraction] = []
        for k in range(1, n + 1):
            numerator = sum(
                normalized[ell + 1] * e[n - ell][k - 1]
                for ell in range(1, n + 1)
            )
            mean_h = numerator / e[n][k]
            assert 0 <= mean_h <= n
            conditional_h.append(mean_h)
        for left, right in zip(conditional_h, conditional_h[1:]):
            assert left <= right
            conditional_monotonicities += 1

        for a_value in a_values:
            coefficients_n = e[n][: n + 1]
            coefficients_next = e[n + 1][: n + 2]
            p_n = polynomial_value(coefficients_n, a_value)
            p_next = polynomial_value(coefficients_next, a_value)
            dp_n = polynomial_derivative_value(coefficients_n, a_value)
            dp_next = polynomial_derivative_value(coefficients_next, a_value)
            ratio = (n + 1) * p_next / p_n
            ratio_derivative = (n + 1) * (dp_next * p_n - p_next * dp_n) / p_n**2

            probabilities = [a_value**k * e[n][k] / p_n for k in range(n + 1)]
            mean_k = sum(Fraction(k) * probabilities[k] for k in range(n + 1))
            mean_h = sum(
                conditional_h[k - 1] * probabilities[k] for k in range(1, n + 1)
            )
            mean_hk = sum(
                conditional_h[k - 1] * k * probabilities[k]
                for k in range(1, n + 1)
            )
            covariance = mean_hk - mean_h * mean_k
            assert covariance >= 0
            covariance_checks += 1
            assert ratio == a_value + mean_h
            insertion_identities += 1
            assert ratio_derivative == 1 + covariance / a_value
            assert ratio - a_value * ratio_derivative <= n
            ratio_concavity_checks += 1

    # Direct recurrence replay for the original F_h and its y derivative.
    f = [Fraction(1)]
    fy = [Fraction(0)]
    alpha = [Fraction(0)] + [(2 - central(n)) / 3 for n in range(1, max_h + 1)]
    beta = [Fraction(0)] + [(1 - 2 * central(n)) / 3 for n in range(1, max_h + 1)]
    deficit_checks = 0
    full_derivative_decompositions = 0
    for h in range(1, max_h + 1):
        f.append(sum(x[n] * f[h - n] for n in range(1, h + 1)) / h)
        fy.append(
            sum(
                alpha[n] * f[h - n] + x[n] * fy[h - n]
                for n in range(1, h + 1)
            )
            / h
        )
        if h >= 2:
            x_ratio = h * f[h] / f[h - 1]
            x_ratio_y = h * (fy[h] * f[h - 1] - f[h] * fy[h - 1]) / f[h - 1] ** 2

            # Replay the normalized derivative, including the y-dependence
            # of the shape C.  Omitting this favorable term would be an
            # invalid frozen-shape differentiation.
            a_value = x[1] / q
            p_h = polynomial_value(e[h][: h + 1], a_value)
            p_previous = polynomial_value(e[h - 1][:h], a_value)
            dp_h = polynomial_derivative_value(e[h][: h + 1], a_value)
            dp_previous = polynomial_derivative_value(e[h - 1][:h], a_value)
            ratio = h * p_h / p_previous
            ratio_a = h * (dp_h * p_previous - p_h * dp_previous) / p_previous**2
            shape_term = Fraction(0)
            for j in range(1, h + 1):
                p_h_minus = polynomial_value(e[h - j][: h - j + 1], a_value)
                if h - 1 - j >= 0:
                    p_previous_minus = polynomial_value(
                        e[h - 1 - j][: h - j], a_value
                    )
                else:
                    p_previous_minus = Fraction(0)
                ratio_c = ratio * a_value / j * (
                    p_h_minus / p_h - p_previous_minus / p_previous
                )
                assert ratio_c >= 0
                ratio_shape_derivatives += 1
                shape_term += ratio_c * normalized_y[j]
            big_q = q - y * q_y
            normalized_decomposition = (
                big_q * (ratio - a_value * ratio_a) - y * q * shape_term
            )
            assert x_ratio == q * ratio
            assert x_ratio - y * x_ratio_y == normalized_decomposition
            assert normalized_decomposition <= big_q * (h - 1)
            full_derivative_decompositions += 1

            increment = 1 - y * x_ratio_y / x_ratio
            assert increment / (h - 1) <= Fraction(7, 3) / y
            deficit_checks += 1

    return {
        "y": y_value,
        "s": s_value,
        "input_log_concavity_minors": input_minors,
        "normalized_log_concavity_minors": normalized_minors,
        "normalized_shape_monotonicities": shape_monotonicities,
        "partial_bell_recursions": partial_bell_recursions,
        "partial_bell_adjacent_column_tp2_minors": tp2_minors,
        "strict_partial_bell_tp2_minors": strict_tp2_minors,
        "conditional_H_monotonicities": conditional_monotonicities,
        "covariance_checks": covariance_checks,
        "insertion_identities": insertion_identities,
        "ratio_concavity_checks": ratio_concavity_checks,
        "ratio_shape_derivatives": ratio_shape_derivatives,
        "full_derivative_decompositions": full_derivative_decompositions,
        "direct_deficit_bound_checks": deficit_checks,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-h", type=int, default=12)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    if args.max_h < 2:
        raise ValueError("max-h must be at least 2")

    symbolic_checks = symbolic_identities()
    parameters = [
        (4 * s + 12 + excess, s)
        for s in (0, 1, 2, 5, 10, 25)
        for excess in (0, 1, 17)
    ]
    records = [one_case(args.max_h, y, s) for y, s in parameters]
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    fields = [
        "input_log_concavity_minors",
        "normalized_log_concavity_minors",
        "normalized_shape_monotonicities",
        "partial_bell_recursions",
        "partial_bell_adjacent_column_tp2_minors",
        "strict_partial_bell_tp2_minors",
        "conditional_H_monotonicities",
        "covariance_checks",
        "insertion_identities",
        "ratio_concavity_checks",
        "ratio_shape_derivatives",
        "full_derivative_decompositions",
        "direct_deficit_bound_checks",
    ]
    report = {
        "status": "PASS_EXACT_LOCAL_POINCARE_DEFICIT_BOUND_REPLAY",
        "all_order_theorem": [
            "the input x_n is log-concave, so C_n=x_n/(x_1 q^(n-1)) is log-concave with C_1=C_2=1",
            "the Toeplitz kernel C_(n-m), hence A_(n,m)=C_(n-m)/n, is TP2",
            "the partial-Bell recurrence e_k=A e_(k-1) makes every adjacent column pair TP2",
            "TP2 makes the uniform-label cycle length decrease in likelihood-ratio order conditional on more cycles",
            "therefore E[H|K] increases, Cov(H,K)>=0, and R_h-a R_h'<=h-1",
            "the normalized shape C_n is nondecreasing in y and the ratio R_h is nondecreasing in each C_n",
            "the shape-derivative term is favorable, giving X_h-y X_h'<=(h-1)(13/12+s/(3y)) and X_h>=y/2",
            "y>=4s implies (delta_h-delta_(h-1))/(h-1)<=7/(3y) for every h>=2",
        ],
        "finite_replay_scope": {
            "max_h": args.max_h,
            "parameter_cases": len(records),
            "symbolic_identities": symbolic_checks,
            **{field: sum(record[field] for record in records) for field in fields},
        },
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(
        json.dumps(
            {
                "status": report["status"],
                **report["finite_replay_scope"],
                "source_sha256": source_hash,
                "report_sha256": report_hash,
                "report": str(args.output),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
