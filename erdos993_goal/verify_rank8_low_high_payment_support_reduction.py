#!/usr/bin/env python3
"""Exact support reduction for the remaining low/high base payment.

The high/high pairwise formula is a positive polynomial circuit in terminals,
h, and adjusted-gap slacks.  Hence subtracting the payment target can create
negative coefficients only on the target's support.  This script derives the
complete (a0,a2)-support: one base slice and eight off-face slices.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_payment_support_reduction_exact_20260820.json"
INPUTS = {
    "verify_rank8_high_high_mlr_convolution.py":
        "2B08339540EA215661E64A76DC4BF8024FF3C4A9C0111B0DE756E3D758E17183",
    "RANK8_HIGH_HIGH_MLR_CONVOLUTION_THEOREM_2026-08-20.md":
        "864E49515CA678D6FAF438E977DAE2CE5248D84F30C69B51763D0173534330A2",
    "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json":
        "F1E5634AE939B2D0C7789B3D20D6AC5588F2EF535895F742E657892900337AD3",
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha(ROOT / name) for name in INPUTS}
    assert actual == INPUTS

    # For each MLR kernel put a=7-i and b=8-k.  After multiplying by the
    # positive factorial denominator, its bracket is
    #   (a+1)B_(b-1)-bB_a
    # = (a+1-b)B_a+(a+1)(B_(b-1)-B_a),
    # a positive polynomial in terminal, h, and raw gap slacks.
    kernel_rows = []
    for i in range(9):
        for k in range(i + 1, 9):
            a, b = 7 - i, 8 - k
            assert a >= b >= 0
            if b == 0:
                certificate = "q_a*q_0"
            else:
                assert a + 1 - b >= 1
                certificate = (
                    f"({a + 1 - b})*B_{a}+({a + 1})*(B_{b - 1}-B_{a})"
                )
            kernel_rows.append({"pair": [i, k], "a_b": [a, b], "certificate": certificate})
    assert len(kernel_rows) == 36

    # The left payment multiplier is p1*p2=A0^2*A1/2.  Ignore the harmless
    # factor 1/2 and expand the two exceptional low slacks.
    x, y, u, v = sp.symbols("x y a0 a2")
    target_left = sp.Poly(sp.expand((x + u + v) ** 2 * (y + v)), u, v)
    support = []
    for exponents, coefficient in sorted(target_left.terms()):
        support.append(
            {
                "a0_a2_exponents": list(exponents),
                "coefficient": str(sp.factor(coefficient)),
            }
        )
    expected = {
        (0, 0): "x**2*y",
        (0, 1): "x*(x + 2*y)",
        (0, 2): "2*x + y",
        (0, 3): "1",
        (1, 0): "2*x*y",
        (1, 1): "2*(x + y)",
        (1, 2): "2",
        (2, 0): "y",
        (2, 1): "1",
    }
    assert {tuple(row["a0_a2_exponents"]): row["coefficient"] for row in support} == expected

    payload = {
        "schema": "rank8-low-high-payment-support-reduction-v1",
        "status": "PASS_EXACT_TARGET_SUPPORT_REDUCTION_NOT_PAYMENT",
        "positive_circuit": (
            "After factorial clearing, every term in the pairwise MLR formula "
            "for M0 is a product of nonnegative rows, adjusted-gap sums, and "
            "the displayed positive kernel brackets. Thus M0 is coefficientwise "
            "nonnegative in terminal, h, and primitive gap slacks."
        ),
        "kernel_rows": kernel_rows,
        "target_left_identity": "2*p1*p2=(x+a0+a2)^2*(y+a2)",
        "target_low_support": support,
        "base_slice": [0, 0],
        "off_face_slices_requiring_payment": [
            list(key) for key in expected if key != (0, 0)
        ],
        "automatic_slices": (
            "Every (a0,a2) exponent outside these nine support pairs has no "
            "target contribution and is coefficientwise nonnegative from M0."
        ),
        "remaining_dependency": (
            "After a hard-low b3,b4,b5 certificate, only the eight listed "
            "off-face low slices can remain; this report does not certify them."
        ),
        "scope_warning": (
            "This is an exact support/no-omission reduction, not a proof of "
            "the eight payment slices or the full low/high cone."
        ),
        "immutable_inputs": actual,
        "source_sha256": sha(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TARGET_SUPPORT", len(support), "OFF_FACE", len(support) - 1)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha(REPORT))


if __name__ == "__main__":
    main()
