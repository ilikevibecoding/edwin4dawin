#!/usr/bin/env python3
"""Explore exact 256-sector certificates for g2 on every marked double-star.

This tests shifted bivariate and boundary-strip power bases.  It is an
exploration artifact until every reported region has zero negative
coefficients and the finite complement is checked.
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
from search_iso_n6_bundle_g2_double_star_box_root import ROLE_PAIRS


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_double_star_sector_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_DOUBLE_STAR_SECTOR_ROOT"
THRESHOLD = 20


def categories(a, b, role_u: str, role_v: str, names):
    marked_left = (role_u == "l") + (role_v == "l")
    marked_right = (role_u == "r") + (role_v == "r")
    rows = {(0, 0): [sp.Integer(0)] * 8, (0, 1): [sp.Integer(0)] * 8,
            (1, 0): [sp.Integer(0)] * 8, (1, 1): [sp.Integer(0)] * 8}
    for left_center in (0, 1):
        for right_center in (0, 1):
            if left_center and right_center:
                continue
            for u_leaf in ((0, 1) if role_u in "lr" else (None,)):
                for v_leaf in ((0, 1) if role_v in "lr" else (None,)):
                    if role_u == "l" and left_center and u_leaf:
                        continue
                    if role_u == "r" and right_center and u_leaf:
                        continue
                    if role_v == "l" and left_center and v_leaf:
                        continue
                    if role_v == "r" and right_center and v_leaf:
                        continue
                    iu = (left_center if role_u == "L" else
                          right_center if role_u == "R" else u_leaf)
                    iv = (left_center if role_v == "L" else
                          right_center if role_v == "R" else v_leaf)
                    selected = left_center + right_center + int(u_leaf or 0) + int(v_leaf or 0)
                    free = ((a - marked_left) if not left_center else 0)
                    free += ((b - marked_right) if not right_center else 0)
                    for rank in range(selected, 8):
                        rows[(int(iu), int(iv))][rank] += sp.binomial(free, rank - selected)
    substitution = {names["n"]: a + b + 2}
    families = {(0, 0): "W", (0, 1): "A", (1, 0): "B", (1, 1): "Z"}
    for state, family in families.items():
        for rank in range(2, 8):
            substitution[names[f"C{family}{rank}"]] = rows[state][rank]
    return substitution


def coefficient_summary(value, variables):
    polynomial = sp.Poly(sp.expand_func(value), *variables)
    coefficients = polynomial.coeffs()
    bad = [coefficient for coefficient in coefficients if coefficient < 0]
    return {
        "terms": len(coefficients),
        "negative": len(bad),
        "minimum": str(min(coefficients)) if coefficients else None,
        "first_negative": str(bad[0]) if bad else None,
    }


def main() -> None:
    structural, _ = structural_substitution()
    cpartition, _ = partition_substitution("C", "c", 7)
    dpartition, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(reconstruct().subs(structural).subs(cpartition).subs(dpartition))
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    for family in "WABZ":
        for rank in range(2, 8):
            names.setdefault(
                f"C{family}{rank}",
                sp.Symbol(f"C{family}{rank}", integer=True, nonnegative=True),
            )
    dvars = tuple(sorted((x for x in expression.free_symbols if str(x).startswith("D")), key=str))
    base = sp.expand(expression.subs({x: 0 for x in dvars}))
    always_negative = {"DA6", "DB6", "DW5", "DW6", "DZ6"}
    always_positive = {"DA4", "DB4", "DZ5"}
    mixed = tuple(sorted(set(map(str, dvars)) - always_negative - always_positive))
    assert len(mixed) == 8
    sectors = []
    for mask in range(1 << len(mixed)):
        selected = always_negative | {label for bit, label in enumerate(mixed) if mask & (1 << bit)}
        value = base
        for dvar in dvars:
            if str(dvar) in selected:
                value += sp.diff(expression, dvar) * names["C" + str(dvar)[1:]]
        sectors.append(sp.expand(value))

    a, b, x, y = sp.symbols("a b x y", integer=True, nonnegative=True)
    rows = []
    total_negative = 0
    for role_u, role_v, orbit in ROLE_PAIRS:
        substitution = categories(a, b, role_u, role_v, names)
        specialized = [sp.expand_func(value.subs(substitution)) for value in sectors]
        interior = {"terms": 0, "negative": 0, "minimum": None, "first": None}
        # Interior a,b >= THRESHOLD.
        for mask, value in enumerate(specialized):
            summary = coefficient_summary(value.subs({a: x + THRESHOLD, b: y + THRESHOLD}), (x, y))
            interior["terms"] += summary["terms"]
            interior["negative"] += summary["negative"]
            local = sp.Rational(summary["minimum"]) if summary["minimum"] is not None else None
            if local is not None and (interior["minimum"] is None or local < interior["minimum"]):
                interior["minimum"] = local
            if summary["first_negative"] is not None and interior["first"] is None:
                interior["first"] = {"mask": mask, "coefficient": summary["first_negative"]}
        # Boundary strips: each fixed a below threshold and unbounded b, and vice versa.
        strip_negative = strip_terms = 0
        strip_first = None
        strip_minimum = None
        amin = marked_left = (role_u == "l") + (role_v == "l")
        bmin = marked_right = (role_u == "r") + (role_v == "r")
        for fixed_side in ("a", "b"):
            fixed_min = amin if fixed_side == "a" else bmin
            other_min_role = bmin if fixed_side == "a" else amin
            for fixed in range(fixed_min, THRESHOLD):
                # Enforce order >=8, hence other >= 6-fixed, as well as role existence.
                other_start = max(other_min_role, 6 - fixed)
                for mask, value in enumerate(specialized):
                    shifted = (value.subs({a: fixed, b: y + other_start}) if fixed_side == "a"
                               else value.subs({b: fixed, a: x + other_start}))
                    variable = y if fixed_side == "a" else x
                    summary = coefficient_summary(shifted, (variable,))
                    strip_terms += summary["terms"]
                    strip_negative += summary["negative"]
                    local = sp.Rational(summary["minimum"]) if summary["minimum"] is not None else None
                    if local is not None and (strip_minimum is None or local < strip_minimum):
                        strip_minimum = local
                    if summary["first_negative"] is not None and strip_first is None:
                        strip_first = {
                            "fixed_side": fixed_side, "fixed": fixed,
                            "other_start": other_start, "mask": mask,
                            "coefficient": summary["first_negative"],
                        }
        row = {
            "orbit": orbit, "roles": [role_u, role_v],
            "interior": {**interior, "minimum": str(interior["minimum"])},
            "boundary_strips": {
                "terms": strip_terms, "negative": strip_negative,
                "minimum": str(strip_minimum), "first": strip_first,
            },
        }
        total_negative += interior["negative"] + strip_negative
        rows.append(row)
        print(orbit, "interior_neg", interior["negative"], "strip_neg", strip_negative, flush=True)
    report = {
        "marker": MARKER, "threshold": THRESHOLD, "sector_count": len(sectors),
        "orbits": rows, "total_negative_power_coefficients": total_negative,
        "status": "exact shifted-power exploration; theorem only if all negatives vanish",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print("TOTAL_NEGATIVE", total_negative)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
