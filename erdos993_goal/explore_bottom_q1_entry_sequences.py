#!/usr/bin/env python3
"""Factor selected Q1 entries and initial minors as sequences in d."""

from __future__ import annotations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data


def factored_rational(value: sp.Expr) -> str:
    numerator, denominator = sp.fraction(sp.cancel(value))
    return f"{sp.factorint(int(numerator))}/{sp.factorint(int(denominator))}"


for d in range(3, 16):
    q = d - 1
    _, _, _, q1, _ = homotopy_data(d)
    print(f"d={d}")
    for name, value in (
        ("bottom-left", q1[q - 1, 0]),
        ("top-right", q1[0, q - 1]),
        ("top-left", q1[0, 0]),
        ("bottom-right", q1[q - 1, q - 1]),
        ("lead-max", q1[: q - 1, : q - 1].det()),
        ("top-right-max", q1[: q - 1, 1:q].det()),
        ("bottom-left-max", q1[1:q, : q - 1].det()),
        ("bottom-right-max", q1[1:q, 1:q].det()),
    ):
        print(f" {name}: {sp.factor(value)} :: {factored_rational(value)}")
