#!/usr/bin/env python3
"""Exact all-order 256-sector rank-six g2 theorem on leaf-marked stars."""

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
OUTPUT = HERE / "iso_n6_bundle_g2_star_leaf_marks_sector_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_STAR_LEAF_MARKS_SECTOR_ROOT"


def main() -> None:
    structural, _ = structural_substitution()
    cpartition, _ = partition_substitution("C", "c", 7)
    dpartition, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(
        reconstruct().subs(structural).subs(cpartition).subs(dpartition)
    )
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    for family in "WABZ":
        for rank in range(2, 8):
            names.setdefault(
                f"C{family}{rank}",
                sp.Symbol(f"C{family}{rank}", nonnegative=True),
            )
    dvars = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    base = sp.expand(expression.subs({symbol: 0 for symbol in dvars}))
    always_negative = {"DA6", "DB6", "DW5", "DW6", "DZ6"}
    always_positive = {"DA4", "DB4", "DZ5"}
    mixed = tuple(sorted(set(map(str, dvars)) - always_negative - always_positive))
    assert len(mixed) == 8
    n = names["n"]
    tail = sp.Symbol("t", integer=True, nonnegative=True)
    cvars = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("C")),
        key=str,
    ))
    for label in sorted(always_negative):
        polynomial = sp.Poly(
            sp.expand((-sp.diff(expression, names[label])).subs(n, tail + 8)),
            tail, *cvars,
        )
        assert all(coefficient >= 0 for coefficient in polynomial.coeffs())
    for label in sorted(always_positive):
        polynomial = sp.Poly(
            sp.expand(sp.diff(expression, names[label]).subs(n, tail + 8)),
            tail, *cvars,
        )
        assert all(coefficient >= 0 for coefficient in polynomial.coeffs())

    star = {}
    for rank in range(2, 8):
        star[names[f"CW{rank}"]] = sp.binomial(n - 3, rank)
        star[names[f"CA{rank}"]] = sp.binomial(n - 3, rank - 1)
        star[names[f"CB{rank}"]] = sp.binomial(n - 3, rank - 1)
        star[names[f"CZ{rank}"]] = sp.binomial(n - 3, rank - 2)

    failures = []
    coefficient_count = 0
    minimum = None
    sector_hashes = []
    for mask in range(1 << len(mixed)):
        current = base
        selected = always_negative | {
            label for bit, label in enumerate(mixed) if mask & (1 << bit)
        }
        for dvar in dvars:
            if str(dvar) in selected:
                current += sp.diff(expression, dvar) * names["C" + str(dvar)[1:]]
        polynomial = sp.Poly(
            sp.expand_func(current.subs(star)).subs(n, tail + 8), tail
        )
        coefficients = tuple(polynomial.all_coeffs())
        coefficient_count += len(coefficients)
        sector_hashes.append(
            hashlib.sha256(str(polynomial.as_expr()).encode()).hexdigest().upper()
        )
        bad = [coefficient for coefficient in coefficients if coefficient < 0]
        if bad:
            failures.append({"mask": mask, "first_negative": str(bad[0])})
        if coefficients:
            local = min(coefficients)
            minimum = local if minimum is None else min(minimum, local)
    assert not failures, failures[:3]

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "scope": (
            "all stars K1,n-1 of order n>=8 with both marks distinct leaves; "
            "arbitrary categorywise induced-D containment"
        ),
        "claim": (
            "all 256 mixed-derivative containment-box vertices are nonnegative, "
            "hence rank-six bundle g2 is nonnegative on this boundary family"
        ),
        "fixed_derivative_signs": {
            "always_nonpositive": sorted(always_negative),
            "always_nonnegative": sorted(always_positive),
            "mixed": list(mixed),
        },
        "sector_count": 256,
        "power_coefficient_count": coefficient_count,
        "minimum_power_coefficient": str(minimum),
        "all_power_coefficients_nonnegative": True,
        "sector_polynomial_hashes_sha256": hashlib.sha256(
            "".join(sector_hashes).encode()
        ).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print("SECTORS", report["sector_count"], "COEFFICIENTS", coefficient_count, "MIN", minimum)
    print(MARKER)


if __name__ == "__main__":
    main()
