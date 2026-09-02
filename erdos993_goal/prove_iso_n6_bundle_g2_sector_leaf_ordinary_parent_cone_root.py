#!/usr/bin/env python3
"""Containment-cone certificate attempt for ordinary-parent g2 leaf increments.

After the exact recurrences A=H+xK and C=A+xH, the sector increment is
affine in each K category.  Since K is an induced marked minor of H, every
KX_r is between zero and HX_r.  Mixed coefficients are split exactly in the
shifted nonnegative power cone; positive parts are dropped and negative parts
are paid at the matching H cap.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution, structural_substitution


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_sector_leaf_ordinary_parent_cone_exact_root_20260831.json"
PASS = "PASS_EXACT_ISO_N6_BUNDLE_G2_SECTOR_LEAF_ORDINARY_PARENT_CONE_ROOT"
FAIL = "PROBE_EXACT_ISO_N6_BUNDLE_G2_SECTOR_LEAF_ORDINARY_PARENT_CONE_ROOT"


def split(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    positive = sp.Integer(0)
    negative = sp.Integer(0)
    for powers, coefficient in polynomial.terms():
        monomial = sp.prod(x**power for x, power in zip(variables, powers))
        if coefficient >= 0:
            positive += coefficient * monomial
        else:
            negative += -coefficient * monomial
    assert sp.expand(expression - positive + negative) == 0
    return sp.expand(positive), sp.expand(negative)


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
            if label in names:
                arow = h[f"{family}{rank}"] + k[f"{family}{rank-1}"]
                after[names[label]] = arow
                before[names[label]] = arow + h[f"{family}{rank-1}"]

    hvars = tuple(sorted(h.values(), key=str))
    kvars = tuple(sorted(k.values(), key=str))
    generators = (t,) + hvars
    failures = []
    total_residual_terms = total_negative = total_payments = 0
    minimum = None
    stream = hashlib.sha256()
    for mask in range(1 << len(mixed)):
        selected = always_negative | {label for bit, label in enumerate(mixed) if mask & (1 << bit)}
        sector = base
        for dvar in dvars:
            if str(dvar) in selected:
                sector += sp.diff(expression, dvar) * names["C" + str(dvar)[1:]]
        delta = sp.expand((sector.subs(before) - sector.subs(after)).subs(m, t + 7))
        if mask == 0:
            print("K_TOTAL_DEGREE", sp.Poly(delta, *kvars).total_degree(), flush=True)
        residual = sp.expand(delta.subs({x: 0 for x in kvars}))
        for kvar in kvars:
            polynomial = sp.Poly(delta, kvar)
            assert polynomial.degree() <= 1
            coefficient = sp.expand(polynomial.coeff_monomial(kvar))
            if coefficient == 0:
                continue
            positive, negative = split(coefficient, generators)
            label = str(kvar)[1:]  # KWr -> Wr
            residual -= negative * h[label]
            total_payments += 1
        residual = sp.expand(residual)
        polynomial = sp.Poly(residual, *generators)
        coefficients = tuple(polynomial.coeffs())
        bad = tuple(x for x in coefficients if x < 0)
        total_residual_terms += len(coefficients)
        total_negative += len(bad)
        if coefficients:
            local = min(coefficients)
            minimum = local if minimum is None else min(minimum, local)
        digest = hashlib.sha256(str(polynomial.as_expr()).encode()).hexdigest().upper()
        stream.update(digest.encode())
        if bad:
            failures.append({"mask": mask, "terms": len(coefficients), "negative": len(bad),
                             "minimum": str(min(coefficients)), "first_negative": str(bad[0]),
                             "residual_sha256": digest})
        if mask % 32 == 0:
            print(mask, len(coefficients), len(bad), flush=True)

    passed = total_negative == 0
    report = {
        "marker": PASS if passed else FAIL,
        "sector_count": 256,
        "range": "order(C)>=8; deleted leaf and its parent are both unmarked",
        "exact_recurrences": ["AX_k=HX_k+KX_(k-1)", "CX_k=AX_k+HX_(k-1)"],
        "containment": "0<=KX_r<=HX_r categorywise",
        "coefficient_split": "exact shifted power split at order(A)=7+t",
        "containment_payments": total_payments,
        "residual_scalar_coefficients": total_residual_terms,
        "negative_residual_scalar_coefficients": total_negative,
        "minimum_residual_scalar_coefficient": str(minimum),
        "failing_sectors": failures,
        "ordered_residual_hash_stream_sha256": stream.hexdigest().upper(),
        "theorem": (
            "Every fixed rank-six g2 category-box sector is nondecreasing when an unmarked leaf with unmarked parent is adjoined."
            if passed else None
        ),
        "status": "exact theorem" if passed else "diagnostic containment cone insufficient",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print("TOTAL", total_residual_terms, "NEGATIVE", total_negative, "MIN", minimum)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
