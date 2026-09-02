#!/usr/bin/env python3
"""Exact free-row cone test for the ordinary-parent leaf increment of g1."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (
    add_leaf,
    substitute,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_ordinary_leaf_two_level_cone_exact_g1_nonadjacent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_LEAF_TWO_LEVEL_CONE_G1_NONADJACENT"


def rows(prefix):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8", nonnegative=True)) for family in "EUVW")


def set_row_zero(expression, *row_sets):
    rules = {row[0]: 1 for row_set in row_sets for row in row_set}
    return sp.expand(expression.subs(rules))


def summary(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *variables)
    bad = [value for value in polynomial.coeffs() if value < 0]
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": len(bad),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "first_negative_scalar_coefficient": str(bad[0]) if bad else None,
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def main():
    expression = reconstruct(1)
    hrows, krows, jrows, lrows = (rows(prefix) for prefix in "HKJL")
    arows = add_leaf(hrows, krows)
    crows = add_leaf(arows, hrows)
    cases = {}

    # Parent absent from the induced D.
    brows = jrows
    base = substitute(expression, arows, brows)
    cases["parent_deleted_leaf_deleted"] = set_row_zero(
        substitute(expression, crows, brows) - base,
        hrows, krows, jrows, lrows,
    )
    cases["parent_deleted_leaf_retained"] = set_row_zero(
        substitute(expression, crows, isolate_multiply(brows, 1)) - base,
        hrows, krows, jrows, lrows,
    )

    # Parent retained: B=J+xL, B-p=J.
    brows = add_leaf(jrows, lrows)
    base = substitute(expression, arows, brows)
    cases["parent_retained_leaf_deleted"] = set_row_zero(
        substitute(expression, crows, brows) - base,
        hrows, krows, jrows, lrows,
    )
    cases["parent_retained_leaf_retained"] = set_row_zero(
        substitute(expression, crows, add_leaf(brows, jrows)) - base,
        hrows, krows, jrows, lrows,
    )

    summaries = {label: summary(value) for label, value in cases.items()}
    for label, row in summaries.items():
        print(label, row)
    report = {
        "marker": MARKER,
        "scope": "ordinary parent p distinct from both marks; free nonnegative row cone",
        "recurrences": [
            "A=H+xK", "C=A+xH",
            "p deleted: B=J and D'=B or (1+x)B",
            "p retained: B=J+xL and D'=B or B+xJ",
        ],
        "cases": summaries,
        "status": (
            "exact free-row cone theorem" if all(
                not row["negative_scalar_coefficients"] for row in summaries.values()
            ) else "exact diagnostic; free-row cone insufficient"
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
