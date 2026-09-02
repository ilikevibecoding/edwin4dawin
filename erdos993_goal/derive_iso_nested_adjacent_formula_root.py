#!/usr/bin/env python3
"""Derive the coefficient next to the diagonal of the nested ISO kernel."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


r = sp.symbols("r", integer=True, positive=True)
OFFSETS = range(-6, 5)


def row(name: str):
    return {k: sp.symbols(f"{name}_{k:+d}") for k in OFFSETS}


def at(values, offset):
    return values.get(offset, 0)


def add_shift(A, C):
    return {k: at(A, k) + at(C, k - 1) for k in OFFSETS}


def kernel2(P, a: int, b: int):
    """Twice coefficient [z^(r+a)w^(r+b)] of K(P)."""
    return sp.expand(
        2 * at(P, a - 1) * at(P, b - 1)
        + (2 * r + a + b) * at(P, a) * at(P, b)
        - (r + b + 1) * at(P, a - 1) * at(P, b + 1)
        - (r + a + 1) * at(P, a + 1) * at(P, b - 1)
    )


def leaf2(A, C, a: int, b: int):
    return sp.expand(
        kernel2(add_shift(A, C), a, b)
        - kernel2(A, a, b)
        - kernel2(C, a - 1, b - 1)
    )


def nested2(E, U, V, W, a: int, b: int):
    return sp.expand(
        leaf2(add_shift(E, U), add_shift(V, W), a, b)
        - leaf2(E, V, a, b)
        - leaf2(U, W, a - 1, b - 1)
    )


def main() -> None:
    E, U, V, W = (row(name) for name in "EUVW")
    diagonal2 = nested2(E, U, V, W, 0, 0)
    adjacent2 = nested2(E, U, V, W, -1, 0)
    report = {
        "marker": "DERIVED_EXACT_ISO_NESTED_ADJACENT_COEFFICIENT",
        "definition": "M_r=2[z^(r-1)w^r]N(E,U,V,W)",
        "adjacent_expression": str(adjacent2),
        "adjacent_term_count": len(sp.Add.make_args(adjacent2)),
        "diagonal_twice_expression": str(diagonal2),
        "diagonal_term_count": len(sp.Add.make_args(diagonal2)),
        "scope": (
            "Exact symbolic coefficient formula only. Finite forest evidence "
            "for M_r>=0 is separate; no all-order sign proof is claimed."
        ),
    }
    Path("iso_nested_adjacent_formula_symbolic_root_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print("adjacent terms", report["adjacent_term_count"])
    print(adjacent2)
    print(report["marker"])


if __name__ == "__main__":
    main()
