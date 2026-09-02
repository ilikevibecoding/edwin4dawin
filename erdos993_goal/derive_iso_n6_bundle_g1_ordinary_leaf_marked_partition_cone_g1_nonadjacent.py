#!/usr/bin/env python3
"""Exact marked-category cone tests for ordinary-leaf monotonicity of rank-six g1."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import add_leaf, substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_ordinary_leaf_marked_partition_cone_exact_g1_nonadjacent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_LEAF_MARKED_PARTITION_CONE_G1_NONADJACENT"


def category_rows(prefix):
    categories = {
        family: [sp.Integer(1) if family == "W" else sp.Integer(0)]
        + [
            sp.Integer(0) if family == "Z" and rank == 1
            else sp.Symbol(f"{prefix}{family}{rank}", nonnegative=True)
            for rank in range(1, 8)
        ]
        for family in "WABZ"
    }
    rows = []
    for family in "EUVW":
        row = []
        for rank in range(8):
            w, a, b, z = (categories[name][rank] for name in "WABZ")
            row.append({"E": w + a + b + z, "U": w + a, "V": w + b, "W": w}[family])
        rows.append(tuple(row))
    return tuple(rows), categories


def summary(expression):
    polynomial = sp.Poly(expression, *sorted(expression.free_symbols, key=str))
    bad = [value for value in polynomial.coeffs() if value < 0]
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": len(bad),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def dominate(expression, larger, smaller, prefix):
    rules = {}
    for family in "WABZ":
        for rank in range(1, 8):
            left = larger[family][rank]
            right = smaller[family][rank]
            if isinstance(left, sp.Symbol) and isinstance(right, sp.Symbol):
                rules[left] = right + sp.Symbol(f"{prefix}{family}{rank}", nonnegative=True)
    return sp.expand(expression.subs(rules))


def main():
    raw = reconstruct(1)
    hrows, hcat = category_rows("H")
    krows, kcat = category_rows("K")
    jrows, jcat = category_rows("J")
    lrows, lcat = category_rows("L")
    arows = add_leaf(hrows, krows)
    crows = add_leaf(arows, hrows)
    cases = {}

    brows = jrows
    base = substitute(raw, arows, brows)
    cases["parent_deleted_leaf_deleted"] = sp.expand(substitute(raw, crows, brows) - base)
    cases["parent_deleted_leaf_retained"] = sp.expand(
        substitute(raw, crows, isolate_multiply(brows, 1)) - base
    )

    brows = add_leaf(jrows, lrows)
    base = substitute(raw, arows, brows)
    cases["parent_retained_leaf_deleted"] = sp.expand(substitute(raw, crows, brows) - base)
    cases["parent_retained_leaf_retained"] = sp.expand(
        substitute(raw, crows, add_leaf(brows, jrows)) - base
    )

    summaries = {}
    for name, value in cases.items():
        row = {"free": summary(value)}
        row["H_dominates_K"] = summary(dominate(value, hcat, kcat, "RK"))
        row["H_dominates_J"] = summary(dominate(value, hcat, jcat, "RJ"))
        if "parent_retained" in name:
            row["J_dominates_L"] = summary(dominate(value, jcat, lcat, "RLJ"))
            row["K_dominates_L"] = summary(dominate(value, kcat, lcat, "RLK"))
            both = dominate(dominate(value, hcat, kcat, "RK2"), jcat, lcat, "RLJ2")
            row["H_ge_K_and_J_ge_L"] = summary(both)
        summaries[name] = row
    report = {
        "marker": MARKER,
        "scope": "ordinary parent distinct from both marks; free nonnegative marked W/A/B/Z categories",
        "recurrences": [
            "A=H+xK", "C=A+xH",
            "p deleted: B=J and D'=B or (1+x)B",
            "p retained: B=J+xL and D'=B or B+xJ",
        ],
        "cases": summaries,
        "status": (
            "exact marked-category cone theorem" if all(
                variant["negative_scalar_coefficients"] == 0
                for row in summaries.values() for variant in row.values()
            ) else "exact diagnostic; free marked-category cone insufficient"
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
