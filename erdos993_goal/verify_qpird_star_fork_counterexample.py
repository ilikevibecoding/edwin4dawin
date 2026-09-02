#!/usr/bin/env python3
"""Independently verify the finite star-fork counterexample to QPIRD.

This refutes the quantitative one-unit reserve and the half-payment
strengthening, not PIRD and not the tree-unimodality conjecture.

Tree construction
-----------------
The root q has two leaf neighbours and one inward neighbour r.
The vertex r has t=1075 child centres, each with m=10 leaves.
Add one isolated vertex z for the QPIRD marked-pair formulation.

Writing A=(1+x)^m+x and L=(1+x)^(mt), rooted recursion gives

    E=A^t,
    P=E+xL,
    C=(1+x)^2 P,
    D=E,
    H=C+(1+x)D,
    B=(1+x)(C+xD).

The coefficient of E is computed in two independent exact ways:
one by a direct binomial sum and one by a consecutive-summand
recurrence.  The two engines must agree at every needed rank.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

from scan_qpird_star_fork_transition import e_coefficient

sys.set_int_max_str_digits(0)


M = 10
T = 1075
ROOT_LEAVES = 2
K = 5372
OUTPUT = Path("qpird_star_fork_counterexample_certificate_20260729.json")


def direct_e_coefficient(m: int, t: int, rank: int) -> int:
    if rank < 0 or rank > m * t:
        return 0
    maximum_j = min(t, rank, (m * t - rank) // (m - 1))
    return sum(
        math.comb(t, j)
        * math.comb(m * (t - j), rank - j)
        for j in range(maximum_j + 1)
    )


def sign(value: int) -> int:
    return -1 if value < 0 else (1 if value > 0 else 0)


def digest(value: int) -> str:
    return hashlib.sha256(str(value).encode("ascii")).hexdigest()


def stable_float(value: Fraction) -> float:
    shift = max(
        0,
        max(
            abs(value.numerator).bit_length(),
            value.denominator.bit_length(),
        )
        - 52,
    )
    numerator = value.numerator
    value_sign = -1 if numerator < 0 else 1
    return value_sign * (
        (abs(numerator) >> shift) / (value.denominator >> shift)
    )


def main() -> None:
    ranks = range(K - 4, K + 4)
    e_direct = {
        rank: direct_e_coefficient(M, T, rank)
        for rank in ranks
    }
    e_recurrence = {
        rank: e_coefficient(M, T, rank)
        for rank in ranks
    }
    engines_agree = e_direct == e_recurrence
    if not engines_agree:
        raise AssertionError("the two exact coefficient engines disagree")

    mt = M * T

    def get(values: dict[int, int], rank: int) -> int:
        return values.get(rank, 0)

    def l(rank: int) -> int:
        return math.comb(mt, rank) if 0 <= rank <= mt else 0

    p = {
        rank: e_direct[rank] + l(rank - 1)
        for rank in ranks
    }
    c = {
        rank: (
            get(p, rank)
            + 2 * get(p, rank - 1)
            + get(p, rank - 2)
        )
        for rank in range(K - 2, K + 3)
    }
    d = e_direct
    h = {
        rank: get(c, rank) + get(d, rank) + get(d, rank - 1)
        for rank in range(K - 1, K + 2)
    }
    b = {
        rank: (
            get(c, rank)
            + get(c, rank - 1)
            + get(d, rank - 1)
            + get(d, rank - 2)
        )
        for rank in range(K, K + 2)
    }

    cm, ck, cp = c[K - 1], c[K], c[K + 1]
    hm, hk = h[K - 1], h[K]

    delta = ck * hk - cp * hm
    qpird_numerator = (K + 1) * delta - ck * hm
    m1_numerator = (K + 1) * cm * hk - K * ck * hm
    half_payment_numerator = (
        2 * (K + 1) * hk * cm * ck
        - cm * ck * hm
        - K * ck * ck * hm
        - (K + 1) * cp * cm * hm
    )
    b_rise = b[K + 1] - b[K]

    u = Fraction(K * ck, cm)
    w = Fraction((K + 1) * cp, ck)
    v = Fraction((K + 1) * hk, hm)

    assertions = {
        "two_exact_engines_agree": engines_agree,
        "operative_B_k_plus_1_above_B_k": b_rise > 0,
        "PIRD_minor_positive": delta > 0,
        "M1_margin_positive": m1_numerator > 0,
        "QPIRD_numerator_negative": qpird_numerator < 0,
        "half_payment_numerator_negative": (
            half_payment_numerator < 0
        ),
        "ratio_identity_QPIRD": (
            v - w - 1
            == Fraction(qpird_numerator, ck * hm)
        ),
        "ratio_identity_M1": (
            v - u
            == Fraction(m1_numerator, cm * hm)
        ),
        "ratio_identity_half_payment": (
            2 * v - 1 - u - w
            == Fraction(
                half_payment_numerator,
                cm * ck * hm,
            )
        ),
    }
    passed = all(assertions.values())
    if not passed:
        raise AssertionError(assertions)

    named_integers = {
        "C_k_minus_1": cm,
        "C_k": ck,
        "C_k_plus_1": cp,
        "H_k_minus_1": hm,
        "H_k": hk,
        "B_k": b[K],
        "B_k_plus_1": b[K + 1],
        "B_rise": b_rise,
        "PIRD_minor": delta,
        "QPIRD_numerator": qpird_numerator,
        "M1_numerator": m1_numerator,
        "half_payment_numerator": half_payment_numerator,
    }
    integer_certificate = {
        name: {
            "sign": sign(value),
            "decimal_digits": len(str(abs(value))),
            "sha256_decimal": digest(value),
        }
        for name, value in named_integers.items()
    }

    tree_order = (
        2
        + ROOT_LEAVES
        + T * (M + 1)
    )
    forest_order_with_isolate = tree_order + 1
    report = {
        "status": "PASS_EXACT_COUNTEREXAMPLE_TO_QPIRD_AND_HP",
        "scope_warning": (
            "This is not a counterexample to PIRD, tree or forest "
            "independence-sequence unimodality, or Erdos Problem 993."
        ),
        "parameters": {
            "leaves_per_child_star_m": M,
            "number_of_child_stars_t": T,
            "direct_root_leaves": ROOT_LEAVES,
            "rank_k": K,
            "tree_order_R": tree_order,
            "forest_order_F_equals_R_plus_isolate": (
                forest_order_with_isolate
            ),
        },
        "coefficient_formula": (
            "E_r=sum_{j=0}^{min(t,r,floor((mt-r)/(m-1)))} "
            "binom(t,j) binom(m(t-j),r-j)"
        ),
        "assertions": assertions,
        "margins": {
            "v_minus_u": stable_float(v - u),
            "v_minus_w": stable_float(v - w),
            "v_minus_w_minus_one": stable_float(v - w - 1),
            "two_v_minus_one_minus_u_minus_w": stable_float(
                2 * v - 1 - u - w
            ),
        },
        "integer_certificate": integer_certificate,
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
