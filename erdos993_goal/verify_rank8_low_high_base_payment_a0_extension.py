#!/usr/bin/env python3
"""Exact a0-extension of the rank-eight base-payment hard face.

Changing the gap slack a0 changes only A0.  Hence every first-factor
coefficient with positive index is affine in a0 and the payment polynomial
is quadratic.  This script checks the two new coefficient polynomials
coefficientwise over the full cumulative-X hard variables.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_base_payment_a0_extension_exact_20260820.json"
NAMES = ("h", "ta", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")
EXPECTED = {
    "verify_rank8_low_high_base_payment_hard_face_amgm.py":
        "8D95452625F2458EE9942A39FD6B7FB93FA62F93B216670C8B802CAE19DEE572",
    "rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json":
        "61A48385D356468133A1D08BDD2D585D28D0B027565ACF7207C467445DF0A6B6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
        (
            math.comb(rank, index) * left[index] * right[rank - index]
            for index in range(rank + 1)
        ),
        zero,
    )


def stats(polynomial):
    terms = negative = 0
    minimum = maximum = None
    example = None
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        terms += 1
        negative += value < 0
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0 and example is None:
            example = {"monomial": list(map(int, monomial)), "coefficient": value}
    return {
        "terms": terms,
        "negative": negative,
        "minimum": minimum,
        "maximum": maximum,
        "first_negative": example,
    }


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    h = variables["h"]
    left_gaps = [2 * h, h, h]
    left_gaps.extend(h + variables[f"a{index}"] for index in range(3, 8))
    right_gaps = [2 * h + variables["b0"]]
    right_gaps.extend(h + variables[f"b{index}"] for index in range(1, 3))
    right_gaps.extend([h] * 5)
    left_ratios, left = factor(variables["ta"], left_gaps, one)
    _, right = factor(variables["tb"], right_gaps, one)
    A0, A1 = left_ratios[0], left_ratios[1]

    # a_i=A0*r_i for i>=1.  The derivative row with respect to a0 is r_i.
    derivative_left = [zero]
    for index in range(1, 10):
        quotient, remainder = divmod(left[index], A0)
        assert remainder == 0
        derivative_left.append(quotient)

    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    d = {rank: convolution(derivative_left, right, rank, zero) for rank in (7, 8, 9)}
    clear_kernel = 196 * right[6] ** 2 - 168 * right[5] * right[7]

    # P(a0)=P(0)+a0*linear+a0^2*quadratic.
    linear = (
        2 * c[8] * d[8]
        - c[7] * d[9]
        - d[7] * c[9]
        - h * (c[7] * d[8] + d[7] * c[8])
        - 2 * h * A0 * A1 * clear_kernel
    )
    quadratic = (
        d[8] ** 2
        - d[7] * d[9]
        - h * d[7] * d[8]
        - h * A1 * clear_kernel
    )
    linear_stats = stats(linear)
    quadratic_stats = stats(quadratic)
    if linear_stats["negative"] or quadratic_stats["negative"]:
        status = "EXACT_COEFFIC_ENCLOSURE_OBSTRUCTION_NOT_VALUE_COUNTEREXAMPLE"
    else:
        status = "PASS_EXACT_A0_EXTENSION_OF_BASE_PAYMENT_HARD_FACE"
    payload = {
        "schema": "rank8-low-high-base-payment-a0-extension-v1",
        "status": status,
        "identity": "P(a0)=P(0)+a0*linear+a0^2*quadratic",
        "base_face": "a2=b3=...=b7=0; a0 newly arbitrary",
        "variables": list(NAMES),
        "linear": linear_stats,
        "quadratic": quadratic_stats,
        "immutable_inputs": actual,
        "scope_warning": (
            "A negative coefficient is only an enclosure obstruction. A PASS extends only "
            "the already certified hard face by a0; a2 and b3..b7 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("linear", linear_stats)
    print("quadratic", quadratic_stats)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
