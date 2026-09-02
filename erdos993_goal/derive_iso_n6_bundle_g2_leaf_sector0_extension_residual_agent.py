#!/usr/bin/env python3
"""Exact sector-0 extension residual for rank-six g2 leaf monotonicity.

This continues the pinned 256-sector ordinary-parent containment cone in its
mask-0 sector.  For order(A)=10+s it applies the genuine independent-set
extension inequalities to the H occupation categories W,A,B,Z, with their
correct rank offsets.  The resulting polynomial is a certified lower bound,
but still has negative coefficients; hence these inequalities do not close
the sector.
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
from prove_iso_n6_bundle_g2_sector_leaf_ordinary_parent_cone_root import split


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_leaf_sector0_extension_residual_exact_agent_20260831.json"
MARKER = "PENDING_EXACT_ISO_N6_BUNDLE_G2_LEAF_SECTOR0_EXTENSION_RESIDUAL_AGENT"


def polynomial_summary(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    terms = polynomial.terms()
    negatives = [(powers, coefficient) for powers, coefficient in terms if coefficient < 0]
    stream = "".join(f"{powers}:{coefficient};" for powers, coefficient in terms)
    return {
        "terms": len(terms),
        "negative_scalar_coefficients": len(negatives),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "first_ten_negative_terms": [
            {"powers": list(powers), "coefficient": str(coefficient)}
            for powers, coefficient in negatives[:10]
        ],
        "ordered_term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        "polynomial_sha256": hashlib.sha256(sp.srepr(polynomial.as_expr()).encode()).hexdigest().upper(),
    }


def main():
    structural, _ = structural_substitution()
    cpartition, _ = partition_substitution("C", "c", 7)
    dpartition, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(reconstruct().subs(structural).subs(cpartition).subs(dpartition))
    names = {str(value): value for value in expression.free_symbols}
    dvars = tuple(sorted(
        (value for value in expression.free_symbols if str(value).startswith("D")), key=str
    ))
    base = expression.subs({value: 0 for value in dvars})
    selected = {"DA6", "DB6", "DW5", "DW6", "DZ6"}  # pinned mask 0

    m, t, s = sp.symbols("m t s", integer=True, nonnegative=True)
    h = {
        f"{family}{rank}": sp.Symbol(f"H{family}{rank}", integer=True, nonnegative=True)
        for family in "WABZ" for rank in range(1, 8)
    }
    k = {
        f"{family}{rank}": sp.Symbol(f"K{family}{rank}", integer=True, nonnegative=True)
        for family in "WABZ" for rank in range(1, 7)
    }
    before, after = {names["n"]: m + 1}, {names["n"]: m}
    for family in "WABZ":
        for rank in range(2, 8):
            label = f"C{family}{rank}"
            if label in names:
                arow = h[f"{family}{rank}"] + k[f"{family}{rank - 1}"]
                after[names[label]] = arow
                before[names[label]] = arow + h[f"{family}{rank - 1}"]

    sector = base
    for dvar in dvars:
        if str(dvar) in selected:
            sector += sp.diff(expression, dvar) * names["C" + str(dvar)[1:]]
    # The pinned cone uses m=7+t.  Shift t=3+s, so order(A)=10+s and every
    # high-rank extension cap below is manifestly nonnegative for s>=0.
    delta = sp.expand((sector.subs(before) - sector.subs(after)).subs(m, t + 7).subs(t, s + 3))
    generators = (s,) + tuple(sorted(h.values(), key=str))

    # Repeat the pinned exact K-category containment payment 0<=KX_r<=HX_r.
    residual = sp.expand(delta.subs({value: 0 for value in k.values()}))
    containment_payments = 0
    for kvar in sorted(k.values(), key=str):
        polynomial = sp.Poly(delta, kvar)
        assert polynomial.degree() <= 1
        coefficient = sp.expand(polynomial.coeff_monomial(kvar))
        if coefficient == 0:
            continue
        _positive, negative = split(coefficient, generators)
        residual -= negative * h[str(kvar)[1:]]
        containment_payments += 1
    residual = sp.expand(residual)
    before_extension = polynomial_summary(residual, generators)

    # If X_r=i_(r-o)(R), then R has at most order(H)-2=s+7 vertices.
    # Thus (r-o)X_r <= (s+8-r+o)X_(r-1).  Whenever the coefficient of X_r
    # is negative, this upper bound gives a rigorous lower bound.
    extension_payments = []
    for family, offset, minimum_rank in (("W", 0, 1), ("A", 1, 2), ("B", 1, 2), ("Z", 2, 3)):
        for rank in range(7, minimum_rank, -1):
            variable = h[f"{family}{rank}"]
            predecessor = h[f"{family}{rank - 1}"]
            polynomial = sp.Poly(residual, variable)
            if polynomial.degree() <= 0:
                continue
            denominator = rank - offset
            cap = s + 8 - rank + offset
            assert denominator > 0
            others = tuple(value for value in generators if value != variable)
            updated = polynomial.coeff_monomial(1)
            for power in range(1, polynomial.degree() + 1):
                coefficient = sp.expand(polynomial.coeff_monomial(variable ** power))
                positive, negative = split(coefficient, others)
                updated += positive * variable ** power
                updated -= negative * (cap * predecessor / denominator) ** power
            residual = sp.expand(updated)
            extension_payments.append({
                "family": family,
                "rank": rank,
                "maximum_power": polynomial.degree(),
                "inequality": (
                    f"{denominator}*H{family}{rank}<=(s+{8-rank+offset})*H{family}{rank-1}"
                ),
            })

    after_extension = polynomial_summary(residual, generators)
    assert after_extension["negative_scalar_coefficients"] > 0
    report = {
        "marker": MARKER,
        "sector": 0,
        "selected_D_box_variables": sorted(selected),
        "range": "order(A)=10+s with integer s>=0",
        "containment_payments": containment_payments,
        "extension_payment_count": len(extension_payments),
        "extension_payments": extension_payments,
        "before_extension_summary": before_extension,
        "after_extension_summary": after_extension,
        "conclusion": (
            "Categorywise K containment plus every consecutive genuine H-category extension inequality "
            "still leaves an exact 92-term residual with 75 negative coefficients (minimum -1140)."
        ),
        "status": "precise finite residual cone; extension inequalities insufficient in sector 0",
        "scope_guard": (
            "Negative residual coefficients are relaxation obstructions, not forest counterexamples. This does "
            "not refute rank-six g2 leaf monotonicity, the coupled parent payment, rank-six G1, or Problem 993."
        ),
        "dependencies_sha256": {
            "pinned_sector_cone_source": "82F2072AD7A41EF74E0263F505AC1272B0F1382150B39A2F24D0CFB7EE1749DC",
            "pinned_sector_cone_report": "853053763505B05C1E658A7554E9456D4CF10AB81162733406351D716A8FBDAF",
            "parent_payment_isolate_transfer_report": "4E3D6F067AFF811BC8D41D12B6581252A20511CFA8E2CB10EFD60D8B98AE8B73",
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "containment_payments": containment_payments,
        "extension_payments": len(extension_payments),
        "before": before_extension,
        "after": after_extension,
        "status": report["status"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
