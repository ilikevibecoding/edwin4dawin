#!/usr/bin/env python3
"""Exact terminal compression of b7 and b6 for direct H_str."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp
from flint import fmpz_mpoly_ctx

from explore_rank8_low_high_b6_compression_q import factor, convolution, stats


ROOT = Path(__file__).resolve().parent
HELPER = ROOT / "explore_rank8_low_high_b6_compression_q.py"
REPORT = ROOT / "rank8_low_high_strong_terminal_compression_b67_exact_20260820.json"
EXPECTED_HELPER = "EA9FFF351AB12C0C2170595CE763335BA535D5A7D9D8CE718B38D94636C5F465"
NAMES = (
    "h", "ta", "a0", "a2", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2", "b3", "b4", "b5",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def symbolic_identities():
    C, h, z = sp.symbols("C h z", nonnegative=True)
    c7, c8, c9 = sp.symbols("c7 c8 c9", nonnegative=True)
    v7, v8, v9 = sp.symbols("v7 v8 v9", nonnegative=True)
    q7, q8, tb, p1 = sp.symbols("q7 q8 tb p1", nonnegative=True)

    def H(x8, x9):
        margin = x8**2 - c7 * x9 - h * c7 * x8
        derivative = (
            2 * x8 * v8 - v7 * x9 - c7 * v9
            - h * (v7 * x8 + c7 * v8)
        )
        return C * margin + h * derivative

    b7_shift = H(c8, c9 + z * q8)
    b7_actual = H(c8, c9)
    b7_correction = z * q8 * (C * c7 + h * v7)
    assert sp.expand(b7_actual - b7_shift - b7_correction) == 0

    E = q7 * (2 * tb + h + 9 * p1)
    b6_shift = H(c8 + z * q7, c9 + z * E + z**2 * q7)
    b6_actual = H(c8, c9)
    L = 2 * tb + 2 * h + 9 * p1
    Q = C * (c7 * L - 2 * c8) + h * (v7 * L - 2 * v8)
    quadratic = C * (c7 - q7) + h * v7
    b6_correction = z * q7 * Q + z**2 * q7 * quadratic
    assert sp.expand(b6_actual - b6_shift - b6_correction) == 0
    return {
        "b7": "H_actual=H_shift+z*q8*(C*c7+h*v7)",
        "b6": (
            "H_actual=H_shift+z*q7*Q+z^2*q7*"
            "(C*(c7-q7)+h*v7)"
        ),
        "Q": "C*(c7*L-2*c8)+h*(v7*L-2*v8)",
        "L": "2*tb+2*h+9*p1",
        "identity_remainders": {"b7": "0", "b6": "0"},
    }


def q_certificate():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    h = variables["h"]
    left_gaps = [
        2 * h + variables["a0"], h, h + variables["a2"],
        h + variables["a3"], h + variables["a4"], h + variables["a5"],
        h + variables["a6"], h + variables["a7"],
    ]
    right_gaps = [
        2 * h + variables["b0"], h + variables["b1"],
        h + variables["b2"], h + variables["b3"],
        h + variables["b4"], h + variables["b5"], h, h,
    ]
    left_ratios, left = factor(variables["ta"], left_gaps, one)
    _, right = factor(variables["tb"], right_gaps, one)
    tail = [zero] * 3 + left[3:]
    c7 = convolution(left, right, 7, zero)
    c8 = convolution(left, right, 8, zero)
    v7 = convolution(tail, right, 7, zero)
    v8 = convolution(tail, right, 8, zero)
    C = left_ratios[2]
    L = 2 * variables["tb"] + 2 * h + 9 * left[1]
    Q = C * (c7 * L - 2 * c8) + h * (v7 * L - 2 * v8)
    row = stats(Q)
    assert row == {
        "terms": 909547,
        "negative": 0,
        "minimum": 7,
        "maximum": 32330362680,
        "first_negative": None,
    }
    return {"variables": list(NAMES), **row}


def main() -> None:
    assert sha256(HELPER) == EXPECTED_HELPER
    identities = symbolic_identities()
    q = q_certificate()
    payload = {
        "schema": "rank8-low-high-strong-terminal-compression-b67-v1",
        "status": "PASS_EXACT_STRONG_TERMINAL_COMPRESSION_B7_B6",
        "theorem": (
            "For direct H_str, arbitrary b7 and then b6 reduce to b7=b6=0 "
            "by exact nonnegative corrections, with every other slack arbitrary."
        ),
        "identities": identities,
        "b6_Q_coefficient_certificate": q,
        "manifest_factors": {
            "b7": "q8*(C*c7+h*v7)>=0",
            "b6_quadratic": "q7*(C*(c7-q7)+h*v7)>=0 because c7>=q7",
        },
        "scope_warning": (
            "This removes only b7 and b6. The simultaneous b3,b4,b5 lift "
            "and the core theorem must be joined separately."
        ),
        "immutable_inputs": {HELPER.name: EXPECTED_HELPER},
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("Q_TERMS", q["terms"], "MIN", q["minimum"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
