#!/usr/bin/env python3
"""Exact pairwise proof of q2>=0 in the rank-eight low/high tail boost.

The same replay derives a fail-closed one-negative-pair reduction for both
the strong auxiliary C*M0+h*d and the Bernstein middle 2*C*M0+h*d.  It does
not assert that the remaining aggregate payment holds.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_tail_q2_pairwise_exact_20260820.json"
EXPECTED = {
    "RANK8_HIGH_HIGH_MLR_CONVOLUTION_THEOREM_2026-08-20.md":
        "864E49515CA678D6FAF438E977DAE2CE5248D84F30C69B51763D0173534330A2",
    "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json":
        "F1E5634AE939B2D0C7789B3D20D6AC5588F2EF535895F742E657892900337AD3",
    "analyze_rank8_low_high_tail_boost_reduction.py":
        "EECF94D2DC0D65CE2517768E9A8EBE9E552FDECF8E07FDDAD2D7D50F57A97E32",
    "rank8_low_high_tail_boost_reduction_exact_20260820.json":
        "2ABAAE9134E9F65EA2DE3934F5D84D3903873EDD39E9BFC1D6F1F99654A124E0",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def value(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def kernel(row, i, k):
    return (
        value(row, 7 - i) * value(row, 8 - k)
        - value(row, 8 - i) * value(row, 7 - k)
    )


def pairwise_replay() -> dict:
    p = sp.symbols("p0:10", nonzero=True)
    q = sp.symbols("r0:10", nonzero=True)
    h, lam, C = sp.symbols("h lambda C", nonzero=True)
    exponent = [int(index >= 3) for index in range(10)]
    scaled = [lam**exponent[index] * p[index] for index in range(10)]
    F = [
        sp.cancel((index + 1) * scaled[index + 1] / scaled[index] + index * h)
        for index in range(9)
    ]
    G = [
        sp.cancel((index + 1) * q[index + 1] / q[index] + index * h)
        for index in range(9)
    ]

    def slice_sum(rank):
        return sum(scaled[index] * q[rank - index] for index in range(rank + 1))

    s7, s8, s9 = (slice_sum(rank) for rank in (7, 8, 9))
    direct = sp.expand(8 * s8**2 - 9 * s7 * s9 - h * s7 * s8)
    left_pairs = sum(
        scaled[i] * scaled[k] * (F[i] - F[k]) * kernel(q, i, k)
        for i in range(9)
        for k in range(i + 1, 9)
    )
    right_pairs = sum(
        q[j] * q[l] * (G[j] - G[l]) * kernel(scaled, j, l)
        for j in range(9)
        for l in range(j + 1, 9)
    )
    pairwise = sp.cancel(left_pairs + right_pairs)
    assert sp.cancel(direct - pairwise) == 0

    direct_q2 = sp.Poly(direct, lam).coeff_monomial(lam**2)
    v = {
        rank: math.factorial(rank)
        * sum(p[index] * q[rank - index] for index in range(3, rank + 1))
        for rank in (7, 8, 9)
    }
    factorial_q2 = v[8] ** 2 - v[7] * v[9] - h * v[7] * v[8]
    assert sp.expand(
        math.factorial(7) * math.factorial(8) * direct_q2 - factorial_q2
    ) == 0

    # On the high base, F_i is decreasing and F_1=F_2.  Its contribution
    # to [lambda^2] consists only of tail/tail gaps and the positive motion
    # of F_2 against later indices.
    Fbase = [sp.cancel(item.subs(lam, 1)) for item in F]
    Cexpr = 3 * p[3] / p[2]
    low_q2 = sum(
        p[i] * p[k] * (Fbase[i] - Fbase[k]) * kernel(q, i, k)
        for i in range(3, 9)
        for k in range(i + 1, 9)
    ) + Cexpr * sum(p[2] * p[k] * kernel(q, 2, k) for k in range(3, 9))

    # For a partner pair j<l put alpha=7-j and beta=8-l, so alpha>=beta.
    # If beta>=4, both products in the kernel have two tail entries.  If
    # beta=3, only the positive product contributes to lambda^2.  Otherwise
    # the coefficient is zero.
    high_q2 = sp.Integer(0)
    high_classes = {"beta_ge_4": 0, "beta_eq_3": 0, "beta_le_2": 0}
    for j in range(9):
        for l in range(j + 1, 9):
            alpha, beta = 7 - j, 8 - l
            if beta >= 4:
                coefficient = kernel(p, j, l)
                high_classes["beta_ge_4"] += 1
            elif beta == 3:
                coefficient = value(p, alpha) * p[3]
                high_classes["beta_eq_3"] += 1
            else:
                coefficient = sp.Integer(0)
                high_classes["beta_le_2"] += 1
            high_q2 += q[j] * q[l] * (G[j] - G[l]) * coefficient
    assert high_classes == {"beta_ge_4": 10, "beta_eq_3": 5, "beta_le_2": 21}
    assert sp.cancel(direct_q2 - low_q2 - high_q2) == 0

    # Differentiate the exact pairwise identity.  For r=1 this is the
    # strong auxiliary; for r=2 it is the middle Bernstein auxiliary.
    auxiliary_checks = []
    for multiplier, label in ((1, "strong"), (2, "bernstein_middle")):
        direct_aux = sp.expand(
            multiplier * C * direct.subs(lam, 1)
            + h * sp.diff(direct, lam).subs(lam, 1)
        )
        pair_aux = sp.cancel(
            multiplier * C * pairwise.subs(lam, 1)
            + h * sp.diff(pairwise, lam).subs(lam, 1)
        )
        assert sp.cancel(direct_aux - pair_aux) == 0
        auxiliary_checks.append(
            {
                "label": label,
                "identity_remainder": "0",
                "clearing": (
                    f"H_{multiplier}={multiplier}*C*M0+h*d="
                    f"{math.factorial(7)}*{math.factorial(8)} times the differentiated pair sum"
                ),
            }
        )

    return {
        "pairwise_margin_identity_remainder": "0",
        "factorial_q2_identity_remainder": "0",
        "q2_pair_decomposition_remainder": "0",
        "low_q2_classes": {
            "tail_tail_pairs": 15,
            "moving_index_2_tail_pairs": 6,
        },
        "high_q2_classes": high_classes,
        "auxiliary_identity_checks": auxiliary_checks,
    }


def sign_classification() -> dict:
    # The classification is finite and index-exact.  e_i records whether
    # the first factor entry is in the scaled tail.
    e = [int(index >= 3) for index in range(9)]
    low_rows = []
    for i in range(9):
        for k in range(i + 1, 9):
            correction = int(i == 2) - int(k == 2)
            if (i, k) == (1, 2):
                sign = "unique_negative_after_F1_equals_F2"
            elif (i, k) == (0, 2):
                sign = "nonnegative_since_F0_minus_F2_ge_h"
            elif correction > 0:
                sign = "nonnegative_positive_index2_correction"
            else:
                sign = "nonnegative_decreasing_F"
            low_rows.append(
                {
                    "pair": [i, k],
                    "tail_exponent": e[i] + e[k],
                    "index2_correction": correction,
                    "sign": sign,
                }
            )
    assert sum(row["sign"].startswith("unique_negative") for row in low_rows) == 1

    high_rows = []
    exceptional = []
    for j in range(9):
        for l in range(j + 1, 9):
            alpha, beta = 7 - j, 8 - l
            eplus = int(alpha >= 3) + int(beta >= 3)
            eminus = int(alpha + 1 >= 3) + int(beta - 1 >= 3)
            if eplus < eminus and value([1] * 10, beta - 1) != 0:
                exceptional.append([j, l, alpha, beta, eplus, eminus])
                sign = "positive_by_exact_A0_or_A1_over_C_ratio"
            else:
                sign = "nonnegative_by_TP2_and_eplus_ge_eminus_or_zero_negative_product"
            high_rows.append(
                {
                    "pair": [j, l],
                    "alpha_beta": [alpha, beta],
                    "exponents": [eplus, eminus],
                    "sign": sign,
                }
            )
    assert exceptional == [
        [5, 6, 2, 2, 0, 1],
        [5, 7, 2, 1, 0, 1],
    ]
    return {
        "low_pairs": low_rows,
        "high_pairs": high_rows,
        "unique_negative_summand": "-h*C*p1*p2*K_q(1,2)",
        "strong_exception_checks": {
            "beta_2": "C*X-(C+h)*Y=(C+h)*Y/2>=0",
            "beta_1": "C*X-(C+h)*Y=Y*(3*A0-C-h)>=Y*(2*C+8*h)>=0",
        },
        "middle_exception_checks": {
            "beta_2": "2*C*X-(2*C+h)*Y=(C+2*h)*Y>=0",
            "beta_1": "2*C*X-(2*C+h)*Y=Y*(6*A0-2*C-h)>=Y*(4*C+17*h)>=0",
        },
        "relations_used": [
            "A1=C+h from F1=F2",
            "A0>=C+3h from delta0>=2h",
            "X/Y=3*(C+h)/(2*C) when beta=2",
            "X/Y=3*A0/C when beta=1",
        ],
    }


def zero_slack_middle() -> dict:
    h, x, y = sp.symbols("h x y", nonnegative=True)
    A = [sp.Integer(0)] * 9
    B = [sp.Integer(0)] * 9
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

    def convolution(left, right, rank):
        return sum(
            math.comb(rank, index) * left[index] * right[rank - index]
            for index in range(rank + 1)
        )

    head = [a[index] if index <= 2 else 0 for index in range(10)]
    tail = [0 if index <= 2 else a[index] for index in range(10)]
    u7, u8, u9 = (convolution(head, b, rank) for rank in (7, 8, 9))
    v7, v8, v9 = (convolution(tail, b, rank) for rank in (7, 8, 9))
    q0 = u8**2 - u7 * u9 - h * u7 * u8
    q1 = 2 * u8 * v8 - u7 * v9 - v7 * u9 - h * (u7 * v8 + v7 * u8)
    q2 = v8**2 - v7 * v9 - h * v7 * v8
    middle = sp.Poly(sp.expand(2 * A[2] * (q0 + q1 + q2) + h * (q1 + 2 * q2)), h, x, y)
    coefficients = [int(coefficient) for coefficient in middle.coeffs()]
    assert len(coefficients) == 149 and min(coefficients) == 2
    assert all(coefficient > 0 for coefficient in coefficients)
    return {
        "variables": "h, low terminal x, high terminal y",
        "terms": len(coefficients),
        "negative_coefficients": 0,
        "minimum_coefficient": min(coefficients),
        "classification": "exact boundary face only, not the full middle auxiliary",
    }


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    payload = {
        "schema": "rank8-low-high-tail-q2-pairwise-v1",
        "status": "PASS_EXACT_Q2_THEOREM_AND_SINGLE_PAYMENT_REDUCTION_NOT_LOW_HIGH_THEOREM",
        "theorem": (
            "For every rank-eight high base with delta1=h and every high partner, "
            "the tail-boost quadratic coefficient q2 is nonnegative."
        ),
        "pairwise_replay": pairwise_replay(),
        "sign_classification": sign_classification(),
        "zero_slack_bernstein_middle": zero_slack_middle(),
        "remaining_dependencies": [
            "Pay the single term h*C*p1*p2*K_q(1,2) from the nonnegative pair reserve in C*M0+h*d to prove the strong auxiliary, or",
            "pay it in 2*C*M0+h*d and combine with an independently certified endpoint",
        ],
        "scope_warning": (
            "This proves q2>=0 and an exact one-negative-pair reduction only.  It does not "
            "prove either auxiliary, the low/high cone, low/low, forest Q8, PGC, or Problem 993."
        ),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
