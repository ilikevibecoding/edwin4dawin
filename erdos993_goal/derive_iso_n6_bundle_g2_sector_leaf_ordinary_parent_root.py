#!/usr/bin/env python3
"""Exact free-cone test for g2 sector leaf increments at an ordinary parent.

For C obtained by attaching an unmarked leaf l to an unmarked vertex p of A,
put H=A-p and K=A-N[p].  Categorywise,
  A_X,k = H_X,k + K_X,k-1,
  C_X,k = A_X,k + H_X,k-1.
This checks all 256 fixed box sectors after that exact two-level recurrence.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution, structural_substitution


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_sector_leaf_ordinary_parent_exact_root_20260831.json"
MARKER = "DERIVE_EXACT_ISO_N6_BUNDLE_G2_SECTOR_LEAF_ORDINARY_PARENT_ROOT"


def main():
    structural, _ = structural_substitution()
    cp, _ = partition_substitution("C", "c", 7)
    dp, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(reconstruct().subs(structural).subs(cp).subs(dp))
    names = {str(x): x for x in expression.free_symbols}
    dvars = tuple(sorted((x for x in expression.free_symbols if str(x).startswith("D")), key=str))
    base = expression.subs({x: 0 for x in dvars})
    always_negative = {"DA6", "DB6", "DW5", "DW6", "DZ6"}
    always_positive = {"DA4", "DB4", "DZ5"}
    mixed = tuple(sorted(set(map(str, dvars)) - always_negative - always_positive))

    m, t = sp.symbols("m t", integer=True, nonnegative=True)
    h = {f"{f}{r}": sp.Symbol(f"H{f}{r}", integer=True, nonnegative=True)
         for f in "WABZ" for r in range(1, 8)}
    k = {f"{f}{r}": sp.Symbol(f"K{f}{r}", integer=True, nonnegative=True)
         for f in "WABZ" for r in range(1, 7)}
    before = {names["n"]: m + 1}
    after = {names["n"]: m}
    for family in "WABZ":
        for rank in range(2, 8):
            label = f"C{family}{rank}"
            if label not in names:
                continue
            arow = h[f"{family}{rank}"] + k[f"{family}{rank-1}"]
            after[names[label]] = arow
            before[names[label]] = arow + h[f"{family}{rank-1}"]

    total_terms = total_negative = 0
    minimum = None
    failing = []
    stream = hashlib.sha256()
    for mask in range(1 << len(mixed)):
        selected = always_negative | {label for bit, label in enumerate(mixed) if mask & (1 << bit)}
        sector = base
        for dvar in dvars:
            if str(dvar) in selected:
                sector += sp.diff(expression, dvar) * names["C" + str(dvar)[1:]]
        delta = sp.expand(sector.subs(before) - sector.subs(after))
        variables = tuple(sorted((delta.free_symbols - {m}) | {t}, key=str))
        polynomial = sp.Poly(sp.expand(delta.subs(m, t + 7)), *variables)
        coefficients = tuple(polynomial.coeffs())
        bad = tuple(x for x in coefficients if x < 0)
        total_terms += len(coefficients)
        total_negative += len(bad)
        if coefficients:
            local = min(coefficients)
            minimum = local if minimum is None else min(minimum, local)
        digest = hashlib.sha256(str(polynomial.as_expr()).encode()).hexdigest().upper()
        stream.update(digest.encode())
        if bad:
            failing.append({"mask": mask, "terms": len(coefficients), "negative": len(bad),
                            "minimum": str(min(coefficients)), "first_negative": str(bad[0])})
        if mask % 32 == 0:
            print(mask, len(coefficients), len(bad), flush=True)

    report = {
        "marker": MARKER, "sector_count": 256,
        "recurrences": ["AX_k=HX_k+KX_(k-1)", "CX_k=AX_k+HX_(k-1)"],
        "range": "order(C)>=8 and parent p distinct from both marks",
        "shifted_scalar_coefficient_count": total_terms,
        "negative_shifted_scalar_coefficients": total_negative,
        "minimum_shifted_scalar_coefficient": str(minimum),
        "failing_sectors": failing,
        "ordered_sector_hash_stream_sha256": stream.hexdigest().upper(),
        "status": "exact free H/K cone theorem" if total_negative == 0 else "diagnostic; free H/K cone insufficient",
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
