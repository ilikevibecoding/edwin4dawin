#!/usr/bin/env python3
"""Exact replay for the all-order T_m-family compensator theorem.

The infinite tail is reduced analytically to two rational endpoint checks.
Only the finite residual box 1 <= m <= 151, 0 <= q <= 97 is expanded.
All arithmetic in this replay is integer or Fraction arithmetic.
"""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path


Polynomial = list[int]
OUTPUT = Path("boundary_sm3_tm_family_all_order_exact_20260813.json")


def multiply(poly: Polynomial, factor: Polynomial) -> Polynomial:
    out = [0] * (len(poly) + len(factor) - 1)
    for i, u in enumerate(poly):
        for j, v in enumerate(factor):
            out[i + j] += u * v
    return out


def lower_delta(m: int, q: int) -> Fraction:
    return Fraction(5 * m, 57) + Fraction(q, 12) - Fraction(151, 228)


def upper_embedded_variance(m: int, q: int) -> Fraction:
    return (Fraction(126 * m, 361) + Fraction(3 * (q + 1), 16)
            + Fraction(1, 14) + Fraction(1, 12))


def tail_certificate(m: int, q: int) -> dict[str, str]:
    delta = lower_delta(m, q)
    variance = upper_embedded_variance(m, q)
    return {
        "m": str(m), "q": str(q), "lower_delta": str(delta),
        "lower_delta_squared_minus_3_upper_variance": str(delta * delta - 3 * variance),
        "derivative_in_m": str(Fraction(10, 57) * delta - Fraction(378, 361)),
        "derivative_in_q": str(delta / 6 - Fraction(9, 16)),
    }


def main() -> int:
    corner_m = tail_certificate(152, 0)
    corner_q = tail_certificate(1, 98)
    for corner in (corner_m, corner_q):
        assert Fraction(corner["lower_delta"]) > 0
        assert Fraction(corner["lower_delta_squared_minus_3_upper_variance"]) > 0
        assert Fraction(corner["derivative_in_m"]) > 0
        assert Fraction(corner["derivative_in_q"]) > 0

    mean_corrections: list[tuple[Fraction, int]] = []
    variance_corrections: list[tuple[Fraction, int]] = []
    for q in range(100):
        w = Fraction(3, 4 ** (q + 1) + 3)
        mean_corrections.append((w * Fraction(3 * q - 1, 4), q))
        variance_corrections.append((w * (1 - w) * Fraction((3 * q - 1) ** 2, 16), q))
    max_mean = max(mean_corrections)
    max_variance = max(variance_corrections)
    assert max_mean == (Fraction(3, 38), 1)
    assert max_variance == (Fraction(300, 4489), 2)
    assert max_variance[0] < Fraction(1, 14)
    # For q>=3, D_q/D_(q+1)<1/3 where D_q=4^(q+1)+3.
    # These dominate the successive mean and variance correction ratios.
    assert Fraction(11, 8) / 3 < 1
    assert Fraction(4, 9) * Fraction(11, 8) ** 2 < 1

    admissible = failures = 0
    minimum: dict[str, int] | None = None
    p: Polynomial = [1]
    for m in range(1, 152):
        p = multiply(p, [1, 3, 1])
        pu = p[:]
        for q in range(98):
            if q:
                pu = multiply(pu, [1, 1])
            n = 2 * m + q
            if n % 3 == 2:
                continue
            admissible += 1
            a = n // 3
            u = multiply(pu, [1, 1])
            at = lambda poly, k: poly[k] if 0 <= k < len(poly) else 0
            margin = 3 * (at(u, a) + at(p, a - q)) - (at(u, a + 1) + at(p, a + 1 - q))
            failures += margin < 0
            item = {"m": m, "q": q, "a": a, "margin": margin}
            if minimum is None or margin < minimum["margin"]:
                minimum = item

    assert admissible == 9865
    assert failures == 0
    assert minimum == {"m": 1, "q": 2, "a": 1, "margin": 4}
    report = {
        "status": "ALL_ORDER_THEOREM_EXACT_REPLAY",
        "theorem": "[x^(a+1)]J_(m,q) <= 3[x^a]J_(m,q)",
        "parameters": "m>=1, q>=0, 2m+q=3a+epsilon, epsilon in {0,1}",
        "finite_residual_box": {"m": [1, 151], "q": [0, 97]},
        "finite_admissible_pairs": admissible, "finite_failures": failures,
        "minimum_finite_margin": minimum,
        "tail_corners": {"m_tail": corner_m, "q_tail": corner_q},
        "mixture_bounds": {
            "mean_correction_max": {"value": str(max_mean[0]), "q": max_mean[1]},
            "variance_correction_max": {"value": str(max_variance[0]), "q": max_variance[1], "used_upper_bound": "1/14"},
        },
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
