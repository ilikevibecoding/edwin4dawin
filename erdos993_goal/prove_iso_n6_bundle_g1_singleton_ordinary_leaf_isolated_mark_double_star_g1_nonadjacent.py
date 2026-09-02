#!/usr/bin/env python3
"""Exact all-order isolated-mark double-star theorem for the G1 leaf delta."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_double_star_transfer_stats_g1_nonadjacent import (
    mode_value,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_double_star_"
    "exact_g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_ISOLATED_MARK_"
    "DOUBLE_STAR_G1_NONADJACENT"
)
PINNED = {
    "leaf_expression_source": (
        "census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent.py",
        "2474323FFAB6D3FBFAC99926E298C698F4C93398D5E0FC7467F18E97F8363126",
    ),
    "double_star_formula_source": (
        "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_double_star_transfer_stats_g1_nonadjacent.py",
        "F1D23FB3A0A734E0C7BAD8D679AAE81DB90F31BD90AEFD5C18BE839515E72C47",
    ),
}
EXPECTED = {
    "collision": {
        "terms": 330,
        "minimum": sp.Rational(17, 120),
        "polynomial_sha256": "98EE606F9E795A1126550F89B04011D5A81183AC2DBA5DE1CA5B432D64C318AF",
    },
    "distinct": {
        "terms": 330,
        "minimum": sp.Rational(17, 120),
        "polynomial_sha256": "0D9DC4E7F67FD7ED6ABB08873D13AC2100D9641069AC9CF660D4ECF690CB4FF9",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected

    n = sp.Symbol("n", integer=True, positive=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    c = sp.Symbol("c", integer=True, nonnegative=True)
    d = sp.Symbol("d", integer=True, nonnegative=True)
    h = sp.Symbol("h", integer=True, nonnegative=True)
    right_leaves = c + 1
    left_leaves = c + 1 + d

    certificates = {}
    for mode in ("collision", "distinct"):
        expression = mode_value(
            mode, left_leaves, right_leaves, h, n, t
        )
        polynomial = sp.Poly(expression, c, d, h, t)
        coefficients = polynomial.coeffs()
        expected = EXPECTED[mode]
        digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
        assert len(polynomial.terms()) == expected["terms"]
        assert all(coefficient >= 0 for coefficient in coefficients)
        assert min(coefficients) == expected["minimum"]
        assert digest == expected["polynomial_sha256"]
        certificates[mode] = {
            "variables": ["c", "d", "h", "t"],
            "terms": len(polynomial.terms()),
            "negative_scalar_coefficients": 0,
            "minimum_scalar_coefficient": str(min(coefficients)),
            "polynomial_sha256": digest,
        }

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "family": {
            "core_component": (
                "a double star: two adjacent hubs, with a=c+1+d leaves on "
                "the left hub and b=c+1 leaves on the right hub"
            ),
            "parameters": "c,d,h,t are arbitrary nonnegative integers",
            "edge_count": "a+b+1=2c+d+3",
            "extra_isolates": "h anonymous isolates",
            "mark_placement": (
                "all distinguished core vertices are isolated: p,u,v in the "
                "collision case and p,q,u,v in the distinct case"
            ),
            "sibling_count": "t is arbitrary",
        },
        "certificates": certificates,
        "checks": {
            "collision_polynomial_hash_locked": True,
            "distinct_polynomial_hash_locked": True,
            "all_660_scalar_coefficients_nonnegative": True,
            "both_minima_equal_17_over_120": True,
        },
        "theorem": (
            "For every isolated-mark double-star post-support core in either "
            "parent case, and for every sibling count, the complete singleton-"
            "ordinary rank-six g1 leaf increment is nonnegative."
        ),
        "remaining_obligation": (
            "marked vertices incident with core edges, non-double-star core "
            "components, multiple nontrivial components, and the full >=5-edge "
            "forest-statistic cone"
        ),
        "scope_guard": (
            "This is an infinite two-hub anchor, not a universal degree-transfer "
            "or majorization theorem. It does not prove the universal leaf lemma, "
            "rank-six g1, N6, or Problem 993."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": expected}
            for label, (name, expected) in PINNED.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "checks": report["checks"],
        "certificates": certificates,
        "remaining_obligation": report["remaining_obligation"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
