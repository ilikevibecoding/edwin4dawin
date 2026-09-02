#!/usr/bin/env python3
"""High-precision replay of an apparent u-monotonicity anomaly.

The input decimals are frozen as exact rationals.  SymPy's exact real-root
isolation is used to count/order positive roots; numerical approximations are
printed only after the exact classification.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


X = sp.symbols("x")
HERE = Path(__file__).resolve().parent
REPORT = HERE / "two_outlier_uv_monotonicity_anomaly_high_precision_20260809.json"


def falling(j: int) -> sp.Expr:
    return sp.prod((X - k for k in range(j)), start=sp.Integer(1))


def elementary(values: list[sp.Rational]) -> list[sp.Rational]:
    e = [sp.Integer(1)] + [sp.Integer(0)] * len(values)
    for value in values:
        for j in range(len(values), 0, -1):
            e[j] += value * e[j - 1]
    return e


def structured_h(B: int, cs: list[sp.Rational]) -> sp.Poly:
    r = len(cs)
    e = elementary([-c for c in cs])
    return sp.Poly(
        sp.expand(
            sum(e[r - j] * 4**j / sp.rf(B + 2, j) * falling(j) for j in range(r + 1))
        ),
        X,
    )


def shift(poly: sp.Poly, amount: int) -> sp.Expr:
    return sp.expand(poly.as_expr().subs(X, X + amount))


def two_steps(H: sp.Poly, B: int, u: sp.Rational, v: sp.Rational) -> sp.Poly:
    J = sp.Poly(
        sp.expand(u * (X + B + 1) * H.as_expr() + (4 - u) * X * shift(H, -1)), X
    )
    return sp.Poly(
        sp.expand(v * (X + B) * J.as_expr() + (4 - v) * X * shift(J, -1)), X
    )


def real_intervals(poly: sp.Poly, digits: int = 35):
    return poly.intervals(eps=sp.Rational(1, 10**digits))


def midpoint(interval) -> sp.Rational:
    (lo, hi), multiplicity = interval
    assert multiplicity == 1
    return (sp.Rational(lo) + sp.Rational(hi)) / 2


def interval_product(intervals) -> tuple[sp.Rational, sp.Rational]:
    lower = sp.prod(sp.Rational(interval[0][0]) for interval in intervals)
    upper = sp.prod(sp.Rational(interval[0][1]) for interval in intervals)
    return lower, upper


def main() -> None:
    B = 46
    # Frozen from the floating probe's printed witness.  Eight significant
    # digits are enough to decide whether the enormous reported jump is real.
    cs = list(
        map(
            sp.Rational,
            [
                "29.9687",
                "0.0134907",
                "0.190652",
                "2.60665",
                "22.8935",
                "0.0119673",
                "0.225436",
            ],
        )
    )
    v = sp.Rational("0.01609685")
    us = list(
        map(
            sp.Rational,
            [
                "0.1333521432163324",
                "0.1778279410038923",
                "0.2371373705661655",
                "0.31622776601683794",
                "0.4216965034285822",
                "0.5623413251903491",
            ],
        )
    )

    H = structured_h(B, cs)
    h_intervals = real_intervals(H)
    h_positive = [z for z in h_intervals if midpoint(z) > 0]
    assert len(h_positive) == len(cs)
    xi_product = sp.prod(midpoint(z) for z in h_positive)
    xi_product_lower, xi_product_upper = interval_product(h_positive)

    rows = []
    for u in us:
        T = two_steps(H, B, u, v)
        intervals = real_intervals(T)
        positives = [z for z in intervals if midpoint(z) > 0]
        selected = positives[-len(cs) :]
        assert len(selected) == len(cs)
        alpha_product = sp.prod(midpoint(z) for z in selected)
        alpha_product_lower, alpha_product_upper = interval_product(selected)
        ratio = alpha_product / (u * v * xi_product)
        ratio_lower = alpha_product_lower / (u * v * xi_product_upper)
        ratio_upper = alpha_product_upper / (u * v * xi_product_lower)
        roots_50 = [str(sp.N(midpoint(z), 50)) for z in intervals]
        rows.append(
            {
                "u": str(u),
                "real_root_count": len(intervals),
                "positive_root_count": len(positives),
                "normalized_product_ratio_40d": str(sp.N(ratio, 40)),
                "normalized_product_ratio_exact_enclosure": [
                    str(ratio_lower),
                    str(ratio_upper),
                ],
                "real_roots_50d": roots_50,
            }
        )
        print(json.dumps(rows[-1]))

    enclosures = [
        tuple(map(sp.Rational, row["normalized_product_ratio_exact_enclosure"]))
        for row in rows
    ]
    certified_drop_then_jump = bool(
        enclosures[2][1] < enclosures[1][0]
        and enclosures[2][1] < enclosures[3][0]
    )
    assert certified_drop_then_jump
    report = {
        "status": "PASS_EXACT_ROOT_ISOLATION_REPLAY",
        "B": B,
        "cs": list(map(str, cs)),
        "v": str(v),
        "rows": rows,
        "coordinatewise_nonincreasing_on_sample": False,
        "certified_drop_then_jump": certified_drop_then_jump,
        "warning": "Witness parameters were reconstructed from printed rounded decimals.",
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {"report": str(REPORT), "certified_drop_then_jump": certified_drop_then_jump},
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
