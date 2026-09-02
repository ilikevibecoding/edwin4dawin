#!/usr/bin/env python3
"""Exact terminal-compression proof for the two highest partner gaps.

Starting from the full base-payment target P=M0-h*p1*p2*Kq(1,2), absorb
``b7`` and then ``b6`` into the partner terminal ratio.  The target kernel is
unchanged in both steps.  For b7 the correction is manifestly positive.  For
b6 the only nontrivial linear correction reduces to one lower-degree
polynomial Q, checked coefficientwise here on the full remaining gap cone.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_base_payment_terminal_compression_b67_corrected_exact_20260820.json"
NAMES = (
    "h", "ta", "a0", "a2", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2", "b3", "b4", "b5",
)


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    coefficients = [one]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(left, right, rank, zero):
    return sum(
        (math.comb(rank, index) * left[index] * right[rank - index]
         for index in range(rank + 1)),
        zero,
    )


def statistics(polynomial):
    terms = negative = 0
    minimum = maximum = None
    first_negative = None
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        terms += 1
        negative += value < 0
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0 and first_negative is None:
            first_negative = {"monomial": list(map(int, monomial)), "coefficient": value}
    return {
        "terms": terms,
        "negative": negative,
        "minimum": minimum,
        "maximum": maximum,
        "first_negative": first_negative,
    }


def main() -> int:
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    h = variables["h"]
    left_gaps = [2 * h + variables["a0"], h, h + variables["a2"]]
    left_gaps.extend(h + variables[f"a{index}"] for index in range(3, 8))
    right_gaps = [2 * h + variables["b0"]]
    right_gaps.extend(h + variables[f"b{index}"] for index in range(1, 6))
    right_gaps.extend([h, h])
    _, left = factor(variables["ta"], left_gaps, one)
    _, right = factor(variables["tb"], right_gaps, one)
    c7 = convolution(left, right, 7, zero)
    c8 = convolution(left, right, 8, zero)

    # With z=b6 and b7=0, compare the actual row to the row obtained by
    # setting b6=0 and replacing tb by tb+z.  Entries q0..q7 agree.  Direct
    # expansion gives
    #   P_actual-P_shifted = z*q7*Q + z^2*q7*(c7-q7),
    # where the payment kernel is identical in the two rows.
    q7 = right[7]
    a1 = left[1]
    # Independent expansion of the actual and terminal-shift rows gives one
    # copy of h here.  The superseded v1 artifact incorrectly used 2*h.
    Q = c7 * (2 * variables["tb"] + h + 9 * a1) - 2 * c8
    remainder_quadratic = c7 - q7
    q_stats = statistics(Q)
    quadratic_stats = statistics(remainder_quadratic)
    assert quadratic_stats["negative"] == 0

    b6_pass = q_stats["negative"] == 0

    payload = {
        "schema": "rank8-low-high-base-payment-terminal-compression-b67-v2",
        "status": (
            "PASS_EXACT_TERMINAL_COMPRESSION_B7_B6_CORRECTED"
            if b6_pass else
            "B6_TERMINAL_COMPRESSION_COEFFICIENT_OBSTRUCTION_NOT_VALUE_COUNTEREXAMPLE"
        ),
        "variables": list(NAMES),
        "b7_identity": (
            "P(tb,b7=z)=P(tb+z,b7=0)+z*c7*q8; all other partner gaps arbitrary"
        ),
        "b6_identity_after_b7_zero": (
            "P_actual=P_terminal_shift+z*q7*Q+z^2*q7*(c7-q7), "
            "Q=c7*(2*tb+h+9*a1)-2*c8"
        ),
        "b6_linear_Q": q_stats,
        "b6_quadratic_factor_c7_minus_q7": quadratic_stats,
        "theorem": (
            "Any proof of the base-payment inequality with b6=b7=0 extends "
            "to arbitrary b6,b7 by successive terminal compression."
            if b6_pass else
            "Only the b7 terminal-compression identity is certified by this artifact."
        ),
        "supersedes_invalid_v1": (
            "rank8_low_high_base_payment_terminal_compression_b67_exact_20260820.json; "
            "its b6 linear factor used 2*h instead of h"
        ),
        "scope_warning": (
            "This eliminates b6,b7 only. Simultaneous b3,b4,b5 remain, and "
            "the full low/high cone still depends on the base payment and q2 chain."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("Q", q_stats)
    print("quadratic", quadratic_stats)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0 if b6_pass else 2


if __name__ == "__main__":
    raise SystemExit(main())
