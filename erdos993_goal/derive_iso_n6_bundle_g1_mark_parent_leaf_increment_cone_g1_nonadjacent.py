#!/usr/bin/env python3
"""Exact cone tests for adding an unmarked leaf at marked vertex u."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from derive_iso_n6_bundle_g1_ordinary_leaf_marked_partition_cone_g1_nonadjacent import category_rows, summary
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_mark_parent_leaf_increment_cone_exact_g1_nonadjacent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_MARK_PARENT_LEAF_INCREMENT_CONE_G1_NONADJACENT"


def free_rows(prefix):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8", nonnegative=True)) for family in "EUVW")


def add_u_leaf(rows):
    e, u, v, w = rows
    sources = (u, u, w, w)
    return tuple(tuple(
        sp.expand(row[rank] + source[rank - 1]) if rank else row[rank]
        for rank in range(8)
    ) for row, source in zip(rows, sources))


def free_summary(expression, row_sets):
    normalized = sp.expand(expression.subs({row[0]: 1 for rows in row_sets for row in rows}))
    return summary(normalized)


def main():
    raw = reconstruct(1)
    arows, brows = free_rows("A"), free_rows("B")
    crows = add_u_leaf(arows)
    free_cases = {
        "leaf_deleted": sp.expand(substitute(raw, crows, brows) - substitute(raw, arows, brows)),
        "leaf_retained": sp.expand(substitute(raw, crows, add_u_leaf(brows)) - substitute(raw, arows, brows)),
    }
    free = {name: free_summary(value, (arows, brows)) for name, value in free_cases.items()}

    acat_rows, _ = category_rows("A")
    bcat_rows, _ = category_rows("B")
    ccat_rows = add_u_leaf(acat_rows)
    category_cases = {
        "leaf_deleted": sp.expand(
            substitute(raw, ccat_rows, bcat_rows) - substitute(raw, acat_rows, bcat_rows)
        ),
        "leaf_retained": sp.expand(
            substitute(raw, ccat_rows, add_u_leaf(bcat_rows)) - substitute(raw, acat_rows, bcat_rows)
        ),
    }
    categories = {name: summary(value) for name, value in category_cases.items()}
    report = {
        "marker": MARKER,
        "recurrence": "E'=E+xU, U'=(1+x)U, V'=V+xW, W'=(1+x)W",
        "free_EUVW": free,
        "free_marked_categories": categories,
        "status": (
            "exact free marked-category cone theorem" if all(
                value["negative_scalar_coefficients"] == 0 for value in categories.values()
            ) else "exact diagnostic; free cones insufficient"
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
