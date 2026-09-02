#!/usr/bin/env python3
"""Exact positive-cone counterexample to monotone b5 terminal compression.

This does not violate the base-payment inequality: both endpoint payments
are positive.  It only disproves P_actual >= P_terminal_shifted.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_b5_terminal_compression_counterexample_exact_20260820.json"


def row(ratios):
    out = [1]
    for ratio in ratios:
        out.append(out[-1] * ratio)
    return out


def convolution(left, right, rank):
    return sum(math.comb(rank, i) * left[i] * right[rank - i] for i in range(rank + 1))


def payment(h, A, B):
    left, right = row(A), row(B)
    c7, c8, c9 = (convolution(left, right, rank) for rank in (7, 8, 9))
    kernel = 196 * right[6] ** 2 - 168 * right[5] * right[7]
    value = c8 * c8 - c7 * c9 - h * c7 * c8 - h * left[1] * left[2] * kernel
    return value, (left, right, c7, c8, c9)


def main():
    h, z, terminal = 1, 1, 10_000
    A = [109, 7, 6, 5, 4, 3, 2, 1, 0]
    B_actual = [10010, 10008, 10007, 10006, 10005, 10004, 10002, 10001, 10000]
    B_shifted = [10010, 10008, 10007, 10006, 10005, 10004, 10003, 10002, 10001]
    assert [A[i] - A[i + 1] for i in range(8)] == [102, 1, 1, 1, 1, 1, 1, 1]
    assert [B_actual[i] - B_actual[i + 1] for i in range(8)] == [2, 1, 1, 1, 1, 2, 1, 1]
    assert [B_shifted[i] - B_shifted[i + 1] for i in range(8)] == [2, 1, 1, 1, 1, 1, 1, 1]
    actual, data = payment(h, A, B_actual)
    shifted, shifted_data = payment(h, A, B_shifted)
    left, q, c7, c8, c9 = data
    difference = actual - shifted
    assert actual > 0 and shifted > 0 and difference < 0

    t = terminal
    a1, a2 = left[1], left[2]
    q5, q6, q7, q8 = q[5:9]
    aux_a = q6 * (2 * t + 3 * h + 8 * a1)
    aux_d = q8 + t * q6 * (2 * t + 3 * h)
    aux_d += 9 * a1 * q6 * (2 * t + 3 * h) + 36 * a2 * q6
    aux_e = q6 * (3 * t + 3 * h + 9 * a1)
    e1 = c7 * aux_d + q6 * c9 - 2 * c8 * aux_a
    e1 += h * (c7 * aux_a + q6 * c8) - 168 * h * a1 * a2 * q5 * q6
    e2 = c7 * aux_e + q6 * aux_d - aux_a * aux_a - 2 * c8 * q6
    e2 += h * q6 * (c7 + aux_a)
    e3 = q6 * (c7 - q7 - 7 * a1 * q6)
    assert difference == z * e1 + z * z * e2 + z**3 * e3

    payload = {
        "schema": "rank8-low-high-b5-terminal-compression-counterexample-v1",
        "status": "EXACT_VALUE_COUNTEREXAMPLE_TO_B5_COMPRESSION_NOT_BASE_PAYMENT",
        "h": h,
        "z_b5": z,
        "terminal_actual": terminal,
        "left_ratios": A,
        "partner_actual_ratios": B_actual,
        "partner_shifted_ratios": B_shifted,
        "P_actual": actual,
        "P_shifted": shifted,
        "difference": difference,
        "cubic_factors": {"E1": e1, "E2": e2, "E3": e3},
        "reconstruction": z * e1 + z * z * e2 + z**3 * e3,
        "scope_warning": (
            "Both P values are positive. This disproves only the proposed "
            "monotone b5 terminal compression, not the base-payment theorem."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("DIFFERENCE", difference)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
