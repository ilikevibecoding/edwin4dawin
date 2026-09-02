#!/usr/bin/env python3
"""Independent exact audit of the corrected b6 terminal-shift factor.

The previously circulated source used 2*h in Q.  Direct algebra gives h.
This file is separate so the withdrawn artifacts remain untouched.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_terminal_compression_b6_corrected_audit_20260820.json"
NAMES = (
    "h", "ta", "a0", "a2", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2", "b3", "b4", "b5",
)


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for i in range(7, -1, -1):
        ratios[i] = ratios[i + 1] + gaps[i]
    row = [one]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return row


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


def main():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    v = dict(zip(NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    h = v["h"]
    left = factor(
        v["ta"],
        [2 * h + v["a0"], h, h + v["a2"]]
        + [h + v[f"a{i}"] for i in range(3, 8)],
        one,
    )
    right = factor(
        v["tb"],
        [2 * h + v["b0"]]
        + [h + v[f"b{i}"] for i in range(1, 6)]
        + [h, h],
        one,
    )
    c7 = convolution(left, right, 7, zero)
    c8 = convolution(left, right, 8, zero)
    q7 = right[7]
    corrected = c7 * (2 * v["tb"] + h + 9 * left[1]) - 2 * c8
    quadratic = c7 - q7
    corrected_stats = stats(corrected)
    quadratic_stats = stats(quadratic)
    status = (
        "PASS_CORRECTED_B6_COMPRESSION"
        if corrected_stats["negative"] == quadratic_stats["negative"] == 0
        else "CORRECTED_B6_COMPRESSION_COEFFICIENT_OBSTRUCTION"
    )
    payload = {
        "schema": "rank8-low-high-terminal-compression-b6-corrected-audit-v1",
        "status": status,
        "exact_shift_identity": (
            "P_actual-P_shifted=z*q7*[c7*(2*tb+h+9*a1)-2*c8]"
            "+z^2*q7*(c7-q7)"
        ),
        "corrected_Q": corrected_stats,
        "quadratic_factor": quadratic_stats,
        "withdrawn_formula": "c7*(2*tb+2*h+9*a1)-2*c8",
        "scope_warning": "This audits only the corrected b6 compression factor.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("Q", corrected_stats)
    print("QUADRATIC", quadratic_stats)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0 if status.startswith("PASS") else 2


if __name__ == "__main__":
    raise SystemExit(main())
