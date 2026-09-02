#!/usr/bin/env python3
"""Exact occupation decomposition of rank-six g2 in no-parent mode."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution, structural_substitution


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NO_PARENT_OCCUPATION_ROOT"


def pieces(expression, groups):
    variables = tuple(x for group in groups for x in group)
    polynomial = sp.Poly(sp.expand(expression), *variables)
    result = {}
    for powers, coefficient in polynomial.terms():
        active = tuple(index for index, group in enumerate(groups)
                       if any(powers[sum(map(len, groups[:index])):sum(map(len, groups[:index + 1]))]))
        key = "".join("ABCD"[index] for index in active) or "constant"
        monomial = coefficient * sp.prod(x**power for x, power in zip(variables, powers))
        result[key] = result.get(key, 0) + monomial
    return {key: sp.expand(value) for key, value in sorted(result.items())}


def summarize(value):
    polynomial = sp.Poly(sp.expand(value), *sorted(value.free_symbols, key=str))
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(1 for x in polynomial.coeffs() if x < 0),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "sha256": hashlib.sha256(str(sp.expand(value)).encode()).hexdigest().upper(),
    }


def main():
    structural, _ = structural_substitution()
    cp, _ = partition_substitution("C", "c", 7)
    dp, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(reconstruct().subs(structural).subs(cp).subs(dp))
    names = {str(x): x for x in expression.free_symbols}
    dvars = tuple(sorted((x for x in expression.free_symbols if str(x).startswith("D")), key=str))
    no_parent = sp.expand(expression.subs({x: names["C" + str(x)[1:]] for x in dvars}))

    a = sp.symbols("a0:8", integer=True, nonnegative=True)
    b = sp.symbols("b0:7", integer=True, nonnegative=True)
    c = sp.symbols("c0:7", integer=True, nonnegative=True)
    d = sp.symbols("d0:6", integer=True, nonnegative=True)
    common = {names["n"]: a[1] + 2}
    for rank in range(2, 8):
        common[names[f"CW{rank}"]] = a[rank]
        common[names[f"CA{rank}"]] = b[rank - 1]
        common[names[f"CB{rank}"]] = c[rank - 1]
        if f"CZ{rank}" in names:
            common[names[f"CZ{rank}"]] = 0
    adjacent = sp.expand(no_parent.subs(common))
    nonadjacent_rules = dict(common)
    for rank in range(2, 8):
        if f"CZ{rank}" in names:
            nonadjacent_rules[names[f"CZ{rank}"]] = d[rank - 2]
    nonadjacent = sp.expand(no_parent.subs(nonadjacent_rules))

    adjacent_pieces = pieces(adjacent, (a, b, c, d))
    nonadjacent_pieces = pieces(nonadjacent, (a, b, c, d))
    assert set(adjacent_pieces) <= {"A", "AB", "AC", "BC"}
    assert set(nonadjacent_pieces) <= {"A", "AB", "AC", "AD", "BC"}
    assert sp.expand(adjacent_pieces["AB"].xreplace(dict(zip(b, c))) - adjacent_pieces["AC"]) == 0
    assert sp.expand(adjacent_pieces["BC"].xreplace({**dict(zip(b, c)), **dict(zip(c, b))}) - adjacent_pieces["BC"]) == 0
    assert sp.expand(nonadjacent - adjacent - nonadjacent_pieces["AD"]) == 0

    report = {
        "marker": MARKER,
        "rank": 6, "coefficient": "g2", "canonical_mode": "no_parent_k0",
        "occupation_rows_adjacent": "W=A,U=A+xB,V=A+xC,E=A+xB+xC",
        "occupation_rows_nonadjacent": "W=A,U=A+xB,V=A+xC,E=A+xB+xC+x^2D",
        "adjacent_split": "A2(A)+L2(A,B)+L2(A,C)+K2(B,C)",
        "nonadjacent_split": "adjacent split+J2(A,D)",
        "pieces": {
            "A2": str(adjacent_pieces["A"]),
            "L2_AB": str(adjacent_pieces["AB"]),
            "L2_AC": str(adjacent_pieces["AC"]),
            "K2_BC": str(adjacent_pieces["BC"]),
            "J2_AD": str(nonadjacent_pieces["AD"]),
        },
        "summaries": {
            key: summarize(value)
            for key, value in {
                "adjacent": adjacent, "nonadjacent": nonadjacent,
                "A2": adjacent_pieces["A"], "L2": adjacent_pieces["AB"],
                "K2": adjacent_pieces["BC"], "J2": nonadjacent_pieces["AD"],
            }.items()
        },
        "identities": {
            "B_C_symmetry": True, "K2_symmetric": True,
            "nonadjacent_minus_adjacent_equals_J2": True,
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
