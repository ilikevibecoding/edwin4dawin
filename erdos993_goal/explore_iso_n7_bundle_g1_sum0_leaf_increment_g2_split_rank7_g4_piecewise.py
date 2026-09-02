#!/usr/bin/env python3
"""Exact diagnostic split of the common0/sum0 G1 pendant-leaf increment.

This is exploratory only.  If T=H+xK is rooted at p, adjoining a new leaf
at p replaces T by (1+x)H+xK.  The script compares the literal rank-seven
G1 increment with the isolated-mark/no-parent specialization of rank-seven
G2 on H and records the exact residual polynomial F(H,K).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
G2_REPORT = HERE / "iso_n7_bundle_g2_parent_modes_exact_rank7_g5_finish_20260831.json"
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_leaf_increment_g2_split_exploration_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "EXPLORE_EXACT_ISO_N7_BUNDLE_G1_SUM0_LEAF_INCREMENT_G2_SPLIT_"
    "RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q(row: tuple[sp.Expr, ...]) -> sp.Expr:
    w3, w4, w5, w6, w7, w8 = row[3:9]
    return sp.expand(
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
    )


def add_x(left: tuple[sp.Expr, ...], right: tuple[sp.Expr, ...]):
    return tuple(
        sp.expand(left[rank] + (right[rank - 1] if rank else 0))
        for rank in range(9)
    )


def polynomial_summary(expression: sp.Expr) -> dict[str, object]:
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *variables)
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(
            1 for value in coefficients if value < 0
        ),
        "minimum_scalar_coefficient": str(min(coefficients)),
        "factorization": str(sp.factor(expression)),
        "polynomial_sha256": hashlib.sha256(
            sp.srepr(expression).encode()
        ).hexdigest().upper(),
    }


def main() -> None:
    g2_report = json.loads(G2_REPORT.read_text(encoding="utf-8"))
    assert g2_report["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G2_PARENT_MODES_RANK7_G5_FINISH"
    )
    names = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}")
        for family in "WABZ" for rank in range(2, 9)
    }
    g2 = sp.expand(sp.sympify(
        g2_report["modes"]["no_parent"]["expression"], locals=names
    ))
    shifts = {}
    for rank in range(3, 9):
        shifts[names[f"A{rank}"]] = names[f"W{rank - 1}"]
        shifts[names[f"B{rank}"]] = names[f"W{rank - 1}"]
    for rank in range(4, 9):
        shifts[names[f"Z{rank}"]] = names[f"W{rank - 2}"]
    g2_isolated = sp.expand(g2.subs(shifts, simultaneous=True))

    h = tuple(sp.Symbol(f"h{rank}") for rank in range(9))
    k = tuple(sp.Symbol(f"k{rank}") for rank in range(9))
    old = add_x(h, k)
    new = add_x(old, h)
    delta = sp.expand(q(new) - q(old))
    g2_h = sp.expand(g2_isolated.subs({
        names[f"W{rank}"]: h[rank] for rank in range(2, 9)
    }))
    residual = sp.expand(delta - g2_h)

    report = {
        "marker": MARKER,
        "status": "exact symbolic diagnostic only; no sign theorem",
        "recurrence": {
            "old_tree": "T=H+xK",
            "new_tree": "T_plus=(1+x)H+xK",
            "H": "T-p",
            "K": "T-N[p]",
        },
        "identity": "q(T_plus)-q(T)=G2_iso_no_parent(H)+F(H,K)",
        "summaries": {
            "leaf_increment": polynomial_summary(delta),
            "rank7_G2_isolated_no_parent_on_H": polynomial_summary(g2_h),
            "residual_F_H_K": polynomial_summary(residual),
        },
        "expressions": {
            "rank7_G2_isolated_no_parent": str(sp.factor(g2_isolated)),
            "residual_F_H_K": str(sp.factor(residual)),
        },
        "scope_guard": (
            "No nonnegativity is asserted for the leaf increment, G2 "
            "specialization, or residual.  This does not close any G1 scope."
        ),
        "dependencies_sha256": {G2_REPORT.name: sha256(G2_REPORT)},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["summaries"]}, indent=2))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
