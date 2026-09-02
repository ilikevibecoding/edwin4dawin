#!/usr/bin/env python3
"""Exact algebra test for absorbing an endpoint parent as a marked leaf.

This is initially a diagnostic identity search.  For adjacent marks u,v in a
forest H, endpoint_u means adjoining a new leaf at u.  The resulting marked
category rows are W'=(1+x)W, A'=(1+x)A, B'=B, Z'=0.  We compare the literal
endpoint_u g2 on H with the already-proved no-parent functional on that larger
marked forest.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n6_bundle_g2_exact_parent_modes_root import build_partitioned


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_endpoint_absorption_probe_rank7_g5_finish_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_ABSORPTION_RANK7_G5_FINISH"


def mode(expression, rows, parent):
    dvariables = tuple(
        symbol for symbol in expression.free_symbols
        if str(symbol).startswith("d") and len(str(symbol)) >= 3
    )
    ranks = {
        "E": {r: rows["W"][r] + rows["A"][r] + rows["B"][r] + rows["Z"][r] for r in range(2, 8)},
        "U": {r: rows["W"][r] + rows["A"][r] for r in range(2, 8)},
        "V": {r: rows["W"][r] + rows["B"][r] for r in range(2, 8)},
        "W": {r: rows["W"][r] for r in range(2, 8)},
    }
    rules = {}
    for variable in dvariables:
        label = str(variable)
        family, rank = label[1], int(label[2:])
        if parent is None:
            source = family
        elif parent == "u":
            source = {"E": "U", "U": "U", "V": "W", "W": "W"}[family]
        elif parent == "v":
            source = {"E": "V", "U": "W", "V": "V", "W": "W"}[family]
        else:
            raise AssertionError(parent)
        rules[variable] = ranks[source][rank]
    return sp.expand(expression.subs(rules))


def grouped_pieces(value, groups):
    variables = tuple(item for group in groups for item in group)
    offsets = []
    start = 0
    for group in groups:
        offsets.append((start, start + len(group)))
        start += len(group)
    result = {}
    for powers, coefficient in sp.Poly(value, *variables).terms():
        active = "".join(
            "ABC"[index]
            for index, (left, right) in enumerate(offsets)
            if any(powers[left:right])
        ) or "constant"
        monomial = coefficient * sp.prod(x**power for x, power in zip(variables, powers))
        result[active] = sp.expand(result.get(active, 0) + monomial)
    return {label: str(sp.expand(piece)) for label, piece in sorted(result.items())}


def main():
    expression, n, rows = build_partitioned()
    adjacent = {rows["Z"][r]: 0 for r in range(2, 8)}
    no_parent_full = mode(expression, rows, None)
    no_parent = sp.expand(no_parent_full.subs(adjacent))
    endpoint_u = sp.expand(mode(expression, rows, "u").subs(adjacent))
    endpoint_v = sp.expand(mode(expression, rows, "v").subs(adjacent))

    low = {
        "W": {1: n - 2},
        "A": {1: sp.Integer(1)},
        "B": {1: sp.Integer(1)},
        "Z": {1: sp.Integer(0)},
    }
    leaf_u = {n: n + 1}
    leaf_v = {n: n + 1}
    for r in range(2, 8):
        leaf_u[rows["W"][r]] = rows["W"][r] + (low["W"][1] if r == 2 else rows["W"][r - 1])
        leaf_u[rows["A"][r]] = rows["A"][r] + (low["A"][1] if r == 2 else rows["A"][r - 1])
        leaf_u[rows["B"][r]] = rows["B"][r]
        leaf_v[rows["W"][r]] = rows["W"][r] + (low["W"][1] if r == 2 else rows["W"][r - 1])
        leaf_v[rows["B"][r]] = rows["B"][r] + (low["B"][1] if r == 2 else rows["B"][r - 1])
        leaf_v[rows["A"][r]] = rows["A"][r]

    no_parent_leaf_u = sp.expand(no_parent.subs(leaf_u, simultaneous=True))
    no_parent_leaf_v = sp.expand(no_parent.subs(leaf_v, simultaneous=True))

    # Re-mark the leaf-extended graph.  These two configurations test whether
    # the endpoint functional is literally one of the existing no-parent
    # marked-pair functionals after moving a mark to the new leaf.
    mark_p_u = {n: n + 1}
    mark_p_v = {n: n + 1}
    for r in range(2, 8):
        wprev = n - 2 if r == 2 else rows["W"][r - 1]
        aprev = 1 if r == 2 else rows["A"][r - 1]
        uprev = n - 1 if r == 2 else rows["W"][r - 1] + rows["A"][r - 1]
        mark_p_u[rows["W"][r]] = rows["W"][r] + rows["A"][r]
        mark_p_u[rows["A"][r]] = rows["B"][r]
        mark_p_u[rows["B"][r]] = uprev
        mark_p_u[rows["Z"][r]] = 0
        mark_p_v[rows["W"][r]] = rows["W"][r] + rows["B"][r]
        mark_p_v[rows["A"][r]] = rows["A"][r]
        mark_p_v[rows["B"][r]] = wprev
        mark_p_v[rows["Z"][r]] = aprev
    no_parent_mark_p_u = sp.expand(no_parent_full.subs(mark_p_u, simultaneous=True).subs(adjacent))
    no_parent_mark_p_v = sp.expand(no_parent_full.subs(mark_p_v, simultaneous=True).subs(adjacent))
    differences = {
        "endpoint_u_minus_no_parent_H": sp.expand(endpoint_u - no_parent),
        "endpoint_v_minus_no_parent_H": sp.expand(endpoint_v - no_parent),
        "no_parent_leaf_u_minus_endpoint_u": sp.expand(no_parent_leaf_u - endpoint_u),
        "no_parent_leaf_v_minus_endpoint_v": sp.expand(no_parent_leaf_v - endpoint_v),
        "no_parent_G_marks_p_u_minus_endpoint_u": sp.expand(no_parent_mark_p_u - endpoint_u),
        "no_parent_G_marks_p_v_minus_endpoint_u": sp.expand(no_parent_mark_p_v - endpoint_u),
    }
    a = sp.symbols("a0:8", integer=True, nonnegative=True)
    b = sp.symbols("b0:7", integer=True, nonnegative=True)
    c = sp.symbols("c0:7", integer=True, nonnegative=True)
    occupation = {n: a[1] + 2}
    for r in range(2, 8):
        occupation[rows["W"][r]] = a[r]
        occupation[rows["A"][r]] = b[r - 1]
        occupation[rows["B"][r]] = c[r - 1]
    endpoint_occupation = {
        "endpoint_u": grouped_pieces(sp.expand(endpoint_u.subs(occupation)), (a, b, c)),
        "endpoint_v": grouped_pieces(sp.expand(endpoint_v.subs(occupation)), (a, b, c)),
    }
    endpoint_u_occupation_expr = sp.expand(endpoint_u.subs(occupation))
    endpoint_derivatives = {
        str(variable): str(sp.factor(sp.diff(endpoint_u_occupation_expr, variable)))
        for variable in (b[2], b[3], b[4], b[5], b[6],
                         c[2], c[3], c[4], c[5], c[6])
    }
    summaries = {}
    for label, value in differences.items():
        poly = sp.Poly(value, *sorted(value.free_symbols, key=str))
        summaries[label] = {
            "is_zero": value == 0,
            "terms": len(poly.terms()),
            "negative_scalar_coefficients": sum(1 for c in poly.coeffs() if c < 0),
            "minimum_scalar_coefficient": str(min(poly.coeffs())),
            "factor": str(sp.factor(value)),
            "sha256": hashlib.sha256(str(value).encode()).hexdigest().upper(),
        }
    report = {
        "marker": MARKER,
        "scope": "adjacent marked u,v; endpoint parent is a leaf at one marked endpoint",
        "category_absorption": {
            "leaf_at_u": "n'=n+1, W'=(1+x)W, A'=(1+x)A, B'=B, Z'=0",
            "leaf_at_v": "n'=n+1, W'=(1+x)W, B'=(1+x)B, A'=A, Z'=0",
        },
        "summaries": summaries,
        "endpoint_occupation_pieces": endpoint_occupation,
        "endpoint_u_induced_row_derivatives": endpoint_derivatives,
        "status": "exact algebra diagnostic; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(summaries, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
