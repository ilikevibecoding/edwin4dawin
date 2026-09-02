#!/usr/bin/env python3
"""Exact generic leaf-increment algebra for all 256 rank-six g2 box sectors.

Let A=C-l for an unmarked leaf l, and H=C-{l,p} where p is its parent.
For each marked-set category X in W,A,B,Z, the literal recurrence is
CX_k=AX_k+HX_{k-1}.  This file tests whether every fixed box-sector value is
monotone under that recurrence in the free nonnegative category cone.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
    structural_substitution,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_sector_leaf_increment_exact_root_20260831.json"
MARKER = "DERIVE_EXACT_ISO_N6_BUNDLE_G2_SECTOR_LEAF_INCREMENT_ROOT"


def main():
    structural, _ = structural_substitution()
    cp, _ = partition_substitution("C", "c", 7)
    dp, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(reconstruct().subs(structural).subs(cp).subs(dp))
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    dvars = tuple(sorted((x for x in expression.free_symbols if str(x).startswith("D")), key=str))
    base = sp.expand(expression.subs({x: 0 for x in dvars}))
    always_negative = {"DA6", "DB6", "DW5", "DW6", "DZ6"}
    always_positive = {"DA4", "DB4", "DZ5"}
    mixed = tuple(sorted(set(map(str, dvars)) - always_negative - always_positive))
    assert len(mixed) == 8

    m, t = sp.symbols("m t", integer=True, nonnegative=True)
    arows = {
        f"{family}{rank}": sp.Symbol(f"A{family}{rank}", integer=True, nonnegative=True)
        for family in "WABZ" for rank in range(2, 8)
    }
    hrows = {
        f"{family}{rank}": sp.Symbol(f"H{family}{rank}", integer=True, nonnegative=True)
        for family in "WABZ" for rank in range(1, 7)
    }
    before_sub = {names["n"]: m + 1}
    after_sub = {names["n"]: m}
    for family in "WABZ":
        for rank in range(2, 8):
            label = f"C{family}{rank}"
            if label in names:
                before_sub[names[label]] = arows[f"{family}{rank}"] + hrows[f"{family}{rank-1}"]
                after_sub[names[label]] = arows[f"{family}{rank}"]

    rows = []
    total_terms = total_negative = 0
    minimum = None
    stream = hashlib.sha256()
    for mask in range(1 << len(mixed)):
        selected = always_negative | {label for bit, label in enumerate(mixed) if mask & (1 << bit)}
        sector = base
        for dvar in dvars:
            if str(dvar) in selected:
                sector += sp.diff(expression, dvar) * names["C" + str(dvar)[1:]]
        delta = sp.expand(sector.subs(before_sub) - sector.subs(after_sub))
        shifted = sp.Poly(sp.expand(delta.subs(m, t + 7)), *sorted((delta.free_symbols - {m}) | {t}, key=str))
        coefficients = tuple(shifted.coeffs())
        bad = tuple(value for value in coefficients if value < 0)
        total_terms += len(coefficients)
        total_negative += len(bad)
        if coefficients:
            local = min(coefficients)
            minimum = local if minimum is None else min(minimum, local)
        digest = hashlib.sha256(str(shifted.as_expr()).encode()).hexdigest().upper()
        stream.update(digest.encode())
        if bad:
            rows.append({
                "mask": mask, "terms": len(coefficients), "negative": len(bad),
                "minimum": str(min(coefficients)), "first_negative": str(bad[0]),
                "shifted_polynomial_sha256": digest,
            })
        print(mask, len(coefficients), len(bad), flush=True) if mask % 32 == 0 else None

    report = {
        "marker": MARKER, "rank": 6, "coefficient": "g2",
        "leaf_recurrence": "CX_k=AX_k+HX_(k-1), order(A)=m, order(C)=m+1",
        "range": "m>=7 (equivalently order(C)>=8)",
        "sector_count": 256, "shifted_scalar_coefficient_count": total_terms,
        "negative_shifted_scalar_coefficients": total_negative,
        "minimum_shifted_scalar_coefficient": str(minimum),
        "failing_sectors": rows,
        "ordered_sector_hash_stream_sha256": stream.hexdigest().upper(),
        "status": (
            "exact generic sectorwise leaf-increment theorem" if total_negative == 0
            else "exact diagnostic; generic free-category cone has negative coefficients"
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print("TOTAL_TERMS", total_terms, "TOTAL_NEGATIVE", total_negative, "MIN", minimum)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
