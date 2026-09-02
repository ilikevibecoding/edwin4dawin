#!/usr/bin/env python3
"""Exact leaf-increment cone diagnostics for three literal g2 parent modes."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution, structural_substitution


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_parent_mode_leaf_increment_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_PARENT_MODE_LEAF_INCREMENT_ROOT"


def summary(value, generators):
    polynomial = sp.Poly(sp.expand(value), *generators)
    coefficients = tuple(polynomial.coeffs())
    bad = tuple(x for x in coefficients if x < 0)
    return {
        "terms": len(coefficients), "negative": len(bad),
        "minimum": str(min(coefficients)) if coefficients else None,
        "first_negative": str(bad[0]) if bad else None,
        "polynomial_sha256": hashlib.sha256(str(polynomial.as_expr()).encode()).hexdigest().upper(),
    }


def main():
    structural, _ = structural_substitution()
    cp, _ = partition_substitution("C", "c", 7)
    dp, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(reconstruct().subs(structural).subs(cp).subs(dp))
    names = {str(x): x for x in expression.free_symbols}
    dvars = tuple(sorted((x for x in expression.free_symbols if str(x).startswith("D")), key=str))
    modes = {}
    for label in ("no_parent", "endpoint_u", "endpoint_v"):
        rules = {}
        for dvar in dvars:
            family_rank = str(dvar)[1:]
            family, rank = family_rank[0], family_rank[1:]
            if label == "no_parent":
                source = family
            elif label == "endpoint_u":
                source = family if family in "WA" else None
            else:
                source = family if family in "WB" else None
            rules[dvar] = 0 if source is None else names[f"C{source}{rank}"]
        modes[label] = sp.expand(expression.subs(rules))

    m, t = sp.symbols("m t", integer=True, nonnegative=True)
    a = {f"{f}{r}": sp.Symbol(f"A{f}{r}", integer=True, nonnegative=True)
         for f in "WABZ" for r in range(2, 8)}
    h = {f"{f}{r}": sp.Symbol(f"H{f}{r}", integer=True, nonnegative=True)
         for f in "WABZ" for r in range(1, 8)}
    k = {f"{f}{r}": sp.Symbol(f"K{f}{r}", integer=True, nonnegative=True)
         for f in "WABZ" for r in range(1, 7)}
    one_before = {names["n"]: m + 1}
    one_after = {names["n"]: m}
    two_before = {names["n"]: m + 1}
    two_after = {names["n"]: m}
    for family in "WABZ":
        for rank in range(2, 8):
            cvar = names.get(f"C{family}{rank}")
            if cvar is None:
                continue
            one_after[cvar] = a[f"{family}{rank}"]
            one_before[cvar] = a[f"{family}{rank}"] + h[f"{family}{rank-1}"]
            avalue = h[f"{family}{rank}"] + k[f"{family}{rank-1}"]
            two_after[cvar] = avalue
            two_before[cvar] = avalue + h[f"{family}{rank-1}"]

    report_modes = {}
    for label, mode in modes.items():
        delta_one = sp.expand((mode.subs(one_before) - mode.subs(one_after)).subs(m, t + 7))
        delta_two = sp.expand((mode.subs(two_before) - mode.subs(two_after)).subs(m, t + 7))
        report_modes[label] = {
            "free_A_H": summary(delta_one, tuple(sorted(delta_one.free_symbols, key=str))),
            "ordinary_parent_free_H_K": summary(delta_two, tuple(sorted(delta_two.free_symbols, key=str))),
        }
        print(label, report_modes[label], flush=True)

    report = {
        "marker": MARKER, "range": "order(C)>=8",
        "modes": report_modes,
        "status": "exact algebraic diagnostics; a mode is a free-cone theorem only when its negative count is zero",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
