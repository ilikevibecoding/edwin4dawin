#!/usr/bin/env python3
"""Exact occupation decomposition for adjacent endpoint-parent rank-six g2.

The two endpoint modes are exchanged by swapping the marked vertices.  The
artifact derives the endpoint_u formula from the literal C/D reconstruction,
specializes to adjacent marks, and writes the four bilinear occupation pieces
needed by the finite and all-order cone certificates.  No sign claim is made.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n6_bundle_g2_exact_parent_modes_root import build_partitioned


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_endpoint_occupation_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_OCCUPATION_RANK7_G5_FINISH"


def endpoint_mode(expression, rows, parent):
    ranks = {
        "E": {r: rows["W"][r] + rows["A"][r] + rows["B"][r] + rows["Z"][r] for r in range(2, 8)},
        "U": {r: rows["W"][r] + rows["A"][r] for r in range(2, 8)},
        "V": {r: rows["W"][r] + rows["B"][r] for r in range(2, 8)},
        "W": {r: rows["W"][r] for r in range(2, 8)},
    }
    source = {
        "u": {"E": "U", "U": "U", "V": "W", "W": "W"},
        "v": {"E": "V", "U": "W", "V": "V", "W": "W"},
    }[parent]
    rules = {}
    for variable in expression.free_symbols:
        label = str(variable)
        if label.startswith("d") and len(label) >= 3:
            family, rank = label[1], int(label[2:])
            rules[variable] = ranks[source[family]][rank]
    return sp.expand(expression.subs(rules))


def pieces(value, groups):
    variables = tuple(item for group in groups for item in group)
    offsets = []
    left = 0
    for group in groups:
        offsets.append((left, left + len(group)))
        left += len(group)
    result = {}
    for powers, coefficient in sp.Poly(value, *variables).terms():
        active = "".join(
            "ABC"[index]
            for index, (start, stop) in enumerate(offsets)
            if any(powers[start:stop])
        ) or "constant"
        monomial = coefficient * sp.prod(x**power for x, power in zip(variables, powers))
        result[active] = sp.expand(result.get(active, 0) + monomial)
    return {label: sp.expand(piece) for label, piece in sorted(result.items())}


def summarize(value):
    polynomial = sp.Poly(value, *sorted(value.free_symbols, key=str))
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(1 for c in polynomial.coeffs() if c < 0),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "sha256": hashlib.sha256(str(value).encode()).hexdigest().upper(),
    }


def main():
    expression, n, rows = build_partitioned()
    adjacent = {rows["Z"][r]: 0 for r in range(2, 8)}
    endpoint_u = sp.expand(endpoint_mode(expression, rows, "u").subs(adjacent))
    endpoint_v = sp.expand(endpoint_mode(expression, rows, "v").subs(adjacent))

    a = sp.symbols("a0:8", integer=True, nonnegative=True)
    b = sp.symbols("b0:7", integer=True, nonnegative=True)
    c = sp.symbols("c0:7", integer=True, nonnegative=True)
    occupation = {n: a[1] + 2}
    for r in range(2, 8):
        occupation[rows["W"][r]] = a[r]
        occupation[rows["A"][r]] = b[r - 1]
        occupation[rows["B"][r]] = c[r - 1]
    u_value = sp.expand(endpoint_u.subs(occupation))
    v_value = sp.expand(endpoint_v.subs(occupation))
    u_pieces = pieces(u_value, (a, b, c))
    assert set(u_pieces) == {"A", "AB", "AC", "BC"}
    assert sp.expand(sum(u_pieces.values()) - u_value) == 0
    swap = {**dict(zip(b, c)), **dict(zip(c, b))}
    assert sp.expand(u_value.xreplace(swap) - v_value) == 0

    labels = {"A2": "A", "L2_AB": "AB", "M2_AC": "AC", "R2_BC": "BC"}
    named = {target: u_pieces[source] for target, source in labels.items()}
    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "scope": "adjacent marks; parent is one marked endpoint",
        "occupation_rows": "W=A,U=A+xB,V=A+xC,E=A+xB+xC",
        "endpoint_u_split": "A2(A)+L2(A,B)+M2(A,C)+R2(B,C)",
        "pieces": {label: str(value) for label, value in named.items()},
        "summaries": {label: summarize(value) for label, value in named.items()},
        "identities": {
            "literal_endpoint_u_reconstructed": True,
            "endpoint_v_is_endpoint_u_under_B_C_swap": True,
        },
        "status": "exact occupation algebra; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "summaries": report["summaries"], "identities": report["identities"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
