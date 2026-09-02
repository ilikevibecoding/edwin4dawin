#!/usr/bin/env python3
"""Exact N>=13 parent cone for all seven small internal-ordinary g2 brooms."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from probe_iso_n5_g2_internal_ordinary_parent_global_cone_rank5_g2_alt import (
    PARENT_ORDER_SHIFT,
    add_parent_order_boxes,
    build_parent_basis,
    cone_row,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_small_parent_global_cone_probe_rank5_g2_alt_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_SMALL_PARENT_GLOBAL_CONE_RANK5_G2_ALT"


def main():
    assert PARENT_ORDER_SHIFT >= 13
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    targets = []
    per_length = []
    for ell in range(1, 8):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        rules = {}
        for rank in range(1, 7):
            rules.update({
                rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
            })
        degree, coefficients = tensor_binomial(sp.expand(expression.subs(rules)), (k,))
        nonzero = [(index[0], form) for index, form in sorted(coefficients.items()) if form != 0]
        per_length.append({"ell": ell, "degree_k": degree[0], "nonzero_forms": len(nonzero)})
        targets.extend((ell, index, form) for index, form in nonzero)

    _variables, basis = build_parent_basis(rows)
    variables, basis, order_rules = add_parent_order_boxes(rows, basis)
    results = []
    for ell, index, form in targets:
        row = {
            "ell": ell, "k_index": index,
            **cone_row(sp.expand(form.subs(order_rules)), variables, basis),
        }
        results.append(row)
        print(ell, index, row["exact_rational_certificate"], flush=True)

    exact = sum(row["exact_rational_certificate"] for row in results)
    report = {
        "marker": MARKER,
        "parent_order_domain": f"N={PARENT_ORDER_SHIFT}+n0, n0>=0 integer",
        "collision_leaf_domain": "integer k>=0",
        "per_length": per_length,
        "basis_size": len(basis), "parent_forms": len(results),
        "exact_decompositions": exact, "unresolved_forms": len(results) - exact,
        "forms": results,
        "scope": (
            "Exact cone probe for ell=1..7 internal ordinary-parent g2 at N>=13. "
            "Only exact_rational_certificate rows prove signs."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "basis_size": len(basis), "parent_forms": len(results),
        "exact_decompositions": exact,
        "unresolved": [[r["ell"], r["k_index"]] for r in results
                       if not r["exact_rational_certificate"]],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
