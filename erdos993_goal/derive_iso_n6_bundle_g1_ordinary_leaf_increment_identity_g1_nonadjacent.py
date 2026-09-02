#!/usr/bin/env python3
"""Exact symbolic identities for ordinary-leaf increments of rank-six g1."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_ordinary_leaf_increment_identity_exact_g1_nonadjacent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_LEAF_INCREMENT_IDENTITY_G1_NONADJACENT"


def add_leaf(rows, parent_deleted_rows):
    return tuple(tuple(
        sp.expand(row[rank] + parent_row[rank - 1]) if rank else row[rank]
        for rank in range(8)
    ) for row, parent_row in zip(rows, parent_deleted_rows))


def substitute(expression, crows, drows):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    rules = {}
    for prefix, rows in (("c", crows), ("d", drows)):
        for family, row in zip("EUVW", rows):
            for rank in range(8):
                name = f"{prefix}{family}{rank}"
                if name in names:
                    rules[names[name]] = row[rank]
    return sp.expand(expression.subs(rules))


def summary(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(expression, *variables)
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(1 for value in coefficients if value < 0),
        "minimum_scalar_coefficient": str(min(coefficients)),
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def main():
    expression = reconstruct(1)
    arows = tuple(tuple(sp.symbols(f"a{family}0:8")) for family in "EUVW")
    hrows = tuple(tuple(sp.symbols(f"h{family}0:8")) for family in "EUVW")
    brows = tuple(tuple(sp.symbols(f"b{family}0:8")) for family in "EUVW")
    krows = tuple(tuple(sp.symbols(f"k{family}0:8")) for family in "EUVW")
    crows = add_leaf(arows, hrows)
    d_isolated_leaf = isolate_multiply(brows, 1)
    d_parent_retained = add_leaf(brows, krows)
    base = substitute(expression, arows, brows)
    deltas = {
        "leaf_deleted_from_D": sp.expand(substitute(expression, crows, brows) - base),
        "leaf_retained_parent_deleted": sp.expand(
            substitute(expression, crows, d_isolated_leaf) - base
        ),
        "leaf_retained_parent_retained": sp.expand(
            substitute(expression, crows, d_parent_retained) - base
        ),
    }
    report = {
        "marker": MARKER,
        "identities": {label: summary(value) for label, value in deltas.items()},
        "recurrences": {
            "C": "C_k=A_k+H_(k-1), H=A-p",
            "D_leaf_deleted": "D=B",
            "D_leaf_retained_parent_deleted": "D_k=B_k+B_(k-1)",
            "D_leaf_retained_parent_retained": "D_k=B_k+K_(k-1), K=B-p",
        },
        "status": "exact algebraic identities only; no sign theorem",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    for label, row in report["identities"].items():
        print(label, row)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
