#!/usr/bin/env python3
"""Exact all-order 256-sector containment-box theorem for leaf-marked stars."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g1_marked_cone_g1_nonadjacent import doubly_partitioned_g1


MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_STAR_LEAF_MARKS_SECTOR_G1_NONADJACENT"


def main():
    _, expression, _, _ = doubly_partitioned_g1()
    names = {str(x): x for x in expression.free_symbols}
    for family in "WABZ":
        for rank in range(2, 8):
            names.setdefault(f"C{family}{rank}", sp.Symbol(f"C{family}{rank}", nonnegative=True))
    dvars = tuple(sorted((x for x in expression.free_symbols if str(x).startswith("D")), key=str))
    base = sp.expand(expression.subs({x: 0 for x in dvars}))
    always_negative = {"DA6", "DB6", "DW5", "DW6", "DZ6"}
    always_positive = {"DA4", "DB4", "DZ5"}
    mixed = tuple(sorted(set(map(str, dvars)) - always_negative - always_positive))
    assert len(mixed) == 8
    for name in sorted(always_negative):
        derivative = sp.Poly(-sp.diff(expression, names[name]), *sorted(
            (x for x in expression.free_symbols if str(x).startswith("C")), key=str
        ))
        assert all(value >= 0 for value in derivative.coeffs())
    for name in sorted(always_positive):
        derivative = sp.Poly(sp.diff(expression, names[name]), *sorted(
            (x for x in expression.free_symbols if str(x).startswith("C")), key=str
        ))
        assert all(value >= 0 for value in derivative.coeffs())

    n, t = sp.symbols("n t", integer=True, nonnegative=True)
    star = {}
    for rank in range(2, 8):
        star[names[f"CW{rank}"]] = sp.binomial(n - 3, rank)
        star[names[f"CA{rank}"]] = sp.binomial(n - 3, rank - 1)
        star[names[f"CB{rank}"]] = sp.binomial(n - 3, rank - 1)
        star[names[f"CZ{rank}"]] = sp.binomial(n - 3, rank - 2)

    failures = []
    minimum_coefficient = None
    coefficient_count = 0
    sector_hashes = []
    for mask in range(1 << len(mixed)):
        current = base
        selected = always_negative | {
            name for bit, name in enumerate(mixed) if mask & (1 << bit)
        }
        for dvar in dvars:
            if str(dvar) in selected:
                current += sp.diff(expression, dvar) * names["C" + str(dvar)[1:]]
        polynomial = sp.Poly(sp.expand_func(current.subs(star)).subs(n, t + 8), t)
        coefficients = tuple(polynomial.all_coeffs())
        coefficient_count += len(coefficients)
        sector_hashes.append(hashlib.sha256(str(polynomial.as_expr()).encode()).hexdigest().upper())
        bad = [value for value in coefficients if value < 0]
        if bad:
            failures.append({"mask": mask, "first_negative": str(bad[0])})
        if coefficients:
            local = min(coefficients)
            minimum_coefficient = local if minimum_coefficient is None else min(minimum_coefficient, local)
    assert not failures
    report = {
        "marker": MARKER,
        "scope": "all stars K1,n-1 of order n>=8 with both marks distinct leaves; arbitrary categorywise induced D containment",
        "claim": "every one of the 256 mixed-derivative containment-box vertices is nonnegative, hence rank-six bundle g1 is nonnegative",
        "fixed_derivative_signs": {
            "always_nonpositive": sorted(always_negative),
            "always_nonnegative": sorted(always_positive),
            "mixed": list(mixed),
        },
        "sector_count": 256,
        "power_coefficient_count": coefficient_count,
        "minimum_power_coefficient": str(minimum_coefficient),
        "all_power_coefficients_nonnegative": True,
        "sector_polynomial_hashes_sha256": hashlib.sha256("".join(sector_hashes).encode()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output = Path("iso_n6_bundle_g1_star_leaf_marks_sector_exact_g1_nonadjacent_20260831.json")
    output.write_text(raw, encoding="utf-8")
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print("SECTORS", report["sector_count"], "COEFFICIENTS", coefficient_count, "MIN", minimum_coefficient)
    print(MARKER)


if __name__ == "__main__":
    main()
