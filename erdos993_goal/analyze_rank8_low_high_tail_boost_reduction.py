#!/usr/bin/env python3
"""Exact low/high tail-boost reduction and fail-closed method obstructions.

This does not claim the low/high cone.  It reduces that cone to two explicit
quadratic auxiliary inequalities and gives exact witnesses showing why two
tempting one-line payments (monotonicity and a three-mass MLR bound) fail.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_tail_boost_reduction_exact_20260820.json"
EXPECTED = {
    "RANK8_FULL_FULL_SPLIT_VARIANCE_REDUCTION_2026-08-20.md":
        "7DDB25FAC1744C82E8742816FB4A886EEC0084D1924613F01F54BC7FDA414118",
    "rank8_full_full_split_variance_identity_independent_audit_exact_20260820.json":
        "70277B30539365BC8AAA78A102DA5129D9C2285869991FBA988B2B8EB8632E8A",
    "RANK8_HIGH_HIGH_MLR_CONVOLUTION_THEOREM_2026-08-20.md":
        "864E49515CA678D6FAF438E977DAE2CE5248D84F30C69B51763D0173534330A2",
    "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json":
        "F1E5634AE939B2D0C7789B3D20D6AC5588F2EF535895F742E657892900337AD3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolution(left, right, rank):
    return sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    )


def coefficients_from_ratios(ratios):
    out = [1]
    for ratio in ratios:
        out.append(out[-1] * ratio)
    return out


def margin(left, right, h):
    c7, c8, c9 = (convolution(left, right, rank) for rank in (7, 8, 9))
    return c8 * c8 - c7 * c9 - h * c7 * c8, (c7, c8, c9)


def tail_quadratic(left, right, h):
    head = left[:]
    tail = left[:]
    for index in range(3, 10):
        head[index] = 0
    for index in range(3):
        tail[index] = 0
    u7, u8, u9 = (convolution(head, right, rank) for rank in (7, 8, 9))
    v7, v8, v9 = (convolution(tail, right, rank) for rank in (7, 8, 9))
    q0 = u8 * u8 - u7 * u9 - h * u7 * u8
    q1 = 2 * u8 * v8 - u7 * v9 - v7 * u9 - h * (u7 * v8 + v7 * u8)
    q2 = v8 * v8 - v7 * v9 - h * v7 * v8
    return q0, q1, q2


def symbolic_quadratic_replay() -> dict:
    u7, u8, u9, v7, v8, v9, h, C, t, lam = sp.symbols(
        "u7 u8 u9 v7 v8 v9 h C t lam", nonzero=True
    )
    c7, c8, c9 = u7 + lam * v7, u8 + lam * v8, u9 + lam * v9
    value = sp.expand(c8**2 - c7 * c9 - h * c7 * c8)
    q0 = u8**2 - u7 * u9 - h * u7 * u8
    q1 = 2 * u8 * v8 - u7 * v9 - v7 * u9 - h * (u7 * v8 + v7 * u8)
    q2 = v8**2 - v7 * v9 - h * v7 * v8
    assert sp.expand(value - (q0 + lam * q1 + lam**2 * q2)) == 0
    M0 = sp.expand(q0 + q1 + q2)
    derivative = sp.expand(q1 + 2 * q2)
    substituted = sp.expand(value.subs(lam, 1 + t / C))
    expected = sp.expand(M0 + t * derivative / C + t**2 * q2 / C**2)
    assert sp.cancel(substituted - expected) == 0

    # Exact coefficient-tail construction.  The base has A1-A2=h.
    A = sp.symbols("A0:9", positive=True)
    base = [sp.Integer(1)]
    for ratio in A:
        base.append(sp.expand(base[-1] * ratio))
    boosted = [base[index] if index <= 2 else lam * base[index] for index in range(10)]
    boosted_ratios = [sp.cancel(boosted[index + 1] / boosted[index]) for index in range(9)]
    assert boosted_ratios[:2] == list(A[:2])
    assert boosted_ratios[2] == lam * A[2]
    assert boosted_ratios[3:] == list(A[3:])

    return {
        "quadratic_remainder": "0",
        "tail_substitution_remainder": "0",
        "M_lambda": "q0+lambda*q1+lambda^2*q2",
        "M_t": "M0+(t/C)*d+(t/C)^2*q2",
        "M0": "q0+q1+q2",
        "d": "q1+2*q2",
        "sufficient_auxiliaries": [
            "q2>=0",
            "C*M0+h*d>=0",
        ],
        "sufficiency": (
            "M0>=0 by the high/high theorem. If d>=0, convexity q2>=0 gives "
            "M(t)>=M0. If d<0, 0<=t<=h gives M(t)>=M0+(h/C)d>=0."
        ),
    }


def zero_slack_coefficient_obstruction() -> dict:
    h, x, y = sp.symbols("h x y", nonnegative=True)
    A = [0] * 9
    B = [0] * 9
    A[8], B[8] = x, y
    for index in range(7, -1, -1):
        A[index] = sp.expand(A[index + 1] + (2 * h if index == 0 else h))
        B[index] = sp.expand(B[index + 1] + (2 * h if index == 0 else h))
    a = [sp.Integer(1)]
    b = [sp.Integer(1)]
    for ratio in A:
        a.append(sp.expand(a[-1] * ratio))
    for ratio in B:
        b.append(sp.expand(b[-1] * ratio))
    q0, q1, q2 = tail_quadratic(a, b, h)
    M0 = sp.expand(q0 + q1 + q2)
    derivative = sp.expand(q1 + 2 * q2)
    strong = sp.Poly(sp.expand(A[2] * M0 + h * derivative), h, x, y)
    negative = [
        {"exponents_h_x_y": list(monomial), "coefficient": int(coefficient)}
        for monomial, coefficient in strong.terms()
        if coefficient < 0
    ]
    assert negative == [
        {"exponents_h_x_y": [5, 1, 11], "coefficient": -195321},
        {"exponents_h_x_y": [4, 2, 11], "coefficient": -96488},
        {"exponents_h_x_y": [3, 3, 11], "coefficient": -4354},
        {"exponents_h_x_y": [3, 2, 12], "coefficient": -561},
        {"exponents_h_x_y": [2, 3, 12], "coefficient": -259},
        {"exponents_h_x_y": [1, 4, 12], "coefficient": -7},
    ]
    q2_poly = sp.Poly(sp.expand(q2), h, x, y)
    assert all(coefficient >= 0 for coefficient in q2_poly.coeffs())
    return {
        "zero_slack_variables": "h>=0, low terminal x>=0, high terminal y>=0",
        "q2_terms": len(q2_poly.terms()),
        "q2_negative_coefficients": 0,
        "strong_auxiliary_terms": len(strong.terms()),
        "strong_auxiliary_negative_coefficients": negative,
        "classification": (
            "exact coefficientwise/enclosure obstruction only; negative monomial "
            "coefficients do not give a negative value of the auxiliary or cone margin"
        ),
    }


def monotonicity_obstruction() -> dict:
    h = 1
    base_ratios = [9, 7, 6, 5, 4, 3, 2, 1, 0]
    high_ratios = [1009, 1007, 1006, 1005, 1004, 1003, 1002, 1001, 1000]
    C = base_ratios[2]
    t = 1
    lam = Fraction(C + t, C)
    base = coefficients_from_ratios(base_ratios)
    high = coefficients_from_ratios(high_ratios)
    q0, q1, q2 = tail_quadratic(base, high, h)
    M0 = q0 + q1 + q2
    derivative = q1 + 2 * q2
    target = [Fraction(value) * (1 if index <= 2 else lam) for index, value in enumerate(base)]
    target_margin, _ = margin(target, high, h)
    assert derivative == -2948130178562995665302039011360069000636800
    assert derivative < 0
    assert M0 > 0 and target_margin > 0 and q2 > 0
    return {
        "h": h,
        "base_low_ratios": base_ratios,
        "high_ratios": high_ratios,
        "C": C,
        "t": t,
        "lambda": str(lam),
        "M0": M0,
        "q2": q2,
        "derivative_at_lambda_1": derivative,
        "target_margin": str(target_margin),
        "classification": (
            "exact obstruction to a monotone-in-tail-boost proof; both endpoint margins "
            "remain positive, so this is not a cone counterexample"
        ),
    }


def boundary_mass_obstruction() -> dict:
    h, t = 1, 1
    low_ratios = [49, 23, 23, 21, 18, 17, 13, 10, 2]
    high_ratios = [201, 163, 124, 123, 108, 88, 62, 47, 9]
    low_gaps = [low_ratios[index] - low_ratios[index + 1] for index in range(8)]
    high_gaps = [high_ratios[index] - high_ratios[index + 1] for index in range(8)]
    assert low_gaps[0] >= 2 * h
    assert low_gaps[1] == h - t
    assert low_gaps[2] >= h + t
    assert all(gap >= h for gap in low_gaps[3:])
    assert high_gaps[0] >= 2 * h and all(gap >= h for gap in high_gaps[1:])
    low = coefficients_from_ratios(low_ratios)
    high = coefficients_from_ratios(high_ratios)
    c7, c8, _ = (convolution(low, high, rank) for rank in (7, 8, 9))
    n7 = low[0] * high[7] + 21 * low[2] * high[5] + high[0] * low[7]
    n8 = low[0] * high[8] + 28 * low[2] * high[6] + high[0] * low[8]
    candidate = Fraction(n7, c7) - Fraction(n8, c8)
    full_margin, (c7, c8, _) = margin(low, high, h)
    full_D = Fraction(full_margin, c7 * c8)
    assert candidate == Fraction(
        -314022094309129485121780798,
        26986051604919033938882588555,
    )
    assert candidate < 0 < full_D
    return {
        "h": h,
        "t": t,
        "low_ratios": low_ratios,
        "high_ratios": high_ratios,
        "candidate": str(candidate),
        "full_D": str(full_D),
        "classification": (
            "exact obstruction to the minimal three-mass MLR payment "
            "Delta_X(0)+Delta_X(point 2)+Delta_Y(0)>=0; the full cone margin is positive"
        ),
    }


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    payload = {
        "schema": "rank8-low-high-tail-boost-reduction-v1",
        "status": "EXACT_REDUCTION_WITH_METHOD_OBSTRUCTIONS_NOT_LOW_HIGH_CONE_THEOREM",
        "factor_cones": {
            "low": "delta0>=2h, delta1=h-t, delta2>=h+t, delta3..delta7>=h, 0<=t<=h",
            "high": "delta0>=2h, delta1..delta7>=h",
        },
        "tail_boost": {
            "base": "replace low A2 by C=A2-t; the resulting row is high with delta1=h",
            "target": "multiply base coefficients at indices >=3 by lambda=1+t/C",
            "ratio_effect": "only A2 changes, from C to C+t; all other ratios are unchanged",
            "bound": "C>=6h, hence 1<=lambda<=7/6",
        },
        "symbolic_replay": symbolic_quadratic_replay(),
        "remaining_auxiliary_inequalities": [
            "q2=v8^2-v7*v9-h*v7*v8>=0 for every high base/high partner",
            "C*M0+h*(q1+2*q2)>=0 for every high base with delta1=h and every high partner",
        ],
        "obstructions": {
            "tail_monotonicity": monotonicity_obstruction(),
            "minimal_boundary_mass_payment": boundary_mass_obstruction(),
            "coefficientwise_zero_slack": zero_slack_coefficient_obstruction(),
        },
        "immutable_inputs": actual,
        "scope_warning": (
            "This package proves the exact reduction only. It does not prove or disprove "
            "the low/high cone, low/low cone, forest Q8, rank-eight PGC, or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
