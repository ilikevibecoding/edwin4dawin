#!/usr/bin/env python3
"""Exact candidate terminal-compression proof for partner gap b5.

Set b6=b7=0.  Compare b5=z, terminal tb=t with b5=0, terminal t+z.
The difference is a cubic in z.  This verifier checks the two nontrivial
coefficient factors separately; the cubic factor is manifestly a positive
convolution tail.  A failed coefficient check is only an enclosure
obstruction, not a value counterexample.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
NAMES = (
    "h", "ta", "a0", "a2", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2", "b3", "b4",
)


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for i in range(7, -1, -1):
        ratios[i] = ratios[i + 1] + gaps[i]
    row = [one]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return ratios, row


def convolution(left, right, rank, zero):
    return sum(
        (math.comb(rank, i) * left[i] * right[rank - i] for i in range(rank + 1)),
        zero,
    )


def stats(poly):
    terms = negative = 0
    minimum = maximum = None
    first_negative = None
    for monomial, coefficient in poly.terms():
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


def construction(part):
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    v = dict(zip(NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    h, t = v["h"], v["tb"]
    _, left = factor(
        v["ta"],
        [2 * h + v["a0"], h, h + v["a2"]]
        + [h + v[f"a{i}"] for i in range(3, 8)],
        one,
    )
    _, right = factor(
        t,
        [2 * h + v["b0"]]
        + [h + v[f"b{i}"] for i in range(1, 5)]
        + [h, h, h],
        one,
    )
    c7 = convolution(left, right, 7, zero)
    a1, a2 = left[1], left[2]
    q5, q6, q7, q8 = right[5], right[6], right[7], right[8]
    e3 = q6 * (c7 - q7 - 7 * a1 * q6)
    # e3=q6*sum_(i=2)^7 C(7,i)*a_i*q_(7-i) by direct convolution.
    expected_e3 = q6 * sum(
        (math.comb(7, i) * left[i] * right[7 - i] for i in range(2, 8)),
        zero,
    )
    assert e3 == expected_e3
    if part == "e3":
        return e3
    c8 = convolution(left, right, 8, zero)
    A = q6 * (2 * t + 3 * h + 8 * a1)
    D = q8 + t * q6 * (2 * t + 3 * h)
    D += 9 * a1 * q6 * (2 * t + 3 * h) + 36 * a2 * q6
    E = q6 * (3 * t + 3 * h + 9 * a1)
    if part == "e2":
        e2 = c7 * E + q6 * D - A * A - 2 * c8 * q6
        e2 += h * q6 * (c7 + A)
        return e2
    c9 = convolution(left, right, 9, zero)
    e1 = c7 * D + q6 * c9 - 2 * c8 * A
    e1 += h * (c7 * A + q6 * c8) - 168 * h * a1 * a2 * q5 * q6
    return e1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--part", choices=("e1", "e2", "e3"), required=True)
    args = parser.parse_args()
    polynomial = construction(args.part)
    result = stats(polynomial)
    status = (
        "PASS_EXACT_B5_TERMINAL_COMPRESSION_FACTOR"
        if result["negative"] == 0
        else "B5_TERMINAL_COMPRESSION_COEFFICIENT_OBSTRUCTION_NOT_VALUE_COUNTEREXAMPLE"
    )
    payload = {
        "schema": "rank8-low-high-base-payment-terminal-compression-b5-v1",
        "status": status,
        "part": args.part,
        "identity": "P_actual-P_shifted=z*E1+z^2*E2+z^3*E3",
        "shift": "actual b5=z,tb=t versus b5=0,tb=t+z, with b6=b7=0",
        "factor_statistics": result,
        "cubic_factor": "E3=q6*(c7-q7-7*a1*q6)>=0",
        "scope_warning": (
            "All three factors must pass for terminal compression. A negative "
            "coefficient is an enclosure obstruction only."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = ROOT / f"rank8_low_high_base_payment_terminal_compression_b5_{args.part}_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status, args.part, result)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", hashlib.sha256(output.read_bytes()).hexdigest().upper())
    return 0 if status.startswith("PASS") else 2


if __name__ == "__main__":
    raise SystemExit(main())
