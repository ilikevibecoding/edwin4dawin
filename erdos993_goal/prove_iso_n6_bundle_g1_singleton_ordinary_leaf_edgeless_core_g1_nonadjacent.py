#!/usr/bin/env python3
"""Exact all-order edgeless-core singleton-ordinary G1 leaf theorem.

For a deepest ordinary support choose one leaf and let t be its remaining
sibling-leaf count.  If the post-support core R is edgeless, then every row
of R and its one/two-vertex deletions is binomial.  This producer rebuilds
the complete retained-parent/retained-leaf rank-six G1 increment and proves
it nonnegative for all t in both p=q and p!=q cases by a shifted power-basis
certificate.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions, symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import isolate_multiply


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_edgeless_core_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_EDGELESS_"
    "CORE_G1_NONADJACENT"
)
PINNED = {
    "leaf_expression_source": (
        "census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent.py",
        "2474323FFAB6D3FBFAC99926E298C698F4C93398D5E0FC7467F18E97F8363126",
    ),
    "binomial_algebra_source": (
        "derive_iso_n4_bundle_polynomial_root.py",
        "F312FB481C76129380823CFC5E1FA6BB2B7D794846136A14477FCC9245D8870E",
    ),
    "canonical_occupation_source": (
        "derive_iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_g1_nonadjacent.py",
        "9D02C3AD011A6A175AC632E6786598691C9D2AAF52456CC2C2832476A1D54954",
    ),
    "canonical_occupation_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_exact_g1_nonadjacent_20260831.json",
        "2AC2037F0D5F2F33B306ED325B7573C7F2D3CEBA062CC0335A5FE06187262C4A",
    ),
}
EXPECTED = {
    "collision": {
        "raw_sha256": "B65AFE0E357A22AD476B356D09FE5C7D03FE4F141D8709981A126698D7EB28F2",
        "shifted_sha256": "C86ED720A2752A36C0B3330F89923F6AD4D35F50477B9C693A52F2FB9168CAAF",
        "terms": 35,
        "minimum": sp.Rational(17, 120),
        "first_order": 3,
    },
    "distinct": {
        "raw_sha256": "1F50D748E1086FD989623888DF95E438051D8198BFBD475562A0BC44C2F85CB3",
        "shifted_sha256": "C178B51AB5BB8A5883A5314A0096F134D47E05A790E80B075BDDBC7D6267C71E",
        "terms": 36,
        "minimum": sp.Rational(17, 120),
        "first_order": 4,
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expression_sha256(expression: sp.Expr) -> str:
    return hashlib.sha256(sp.srepr(sp.expand(expression)).encode()).hexdigest().upper()


def replace_rows(expression, **blocks):
    rules = {}
    for prefix, actual in blocks.items():
        generic = symbolic_rows(prefix)
        for generic_row, actual_row in zip(generic, actual):
            rules.update(dict(zip(generic_row, actual_row)))
    return sp.expand(expression.subs(rules))


def structural(rows, order):
    e, u, v, w = rows
    return {
        e[0]: 1, u[0]: 1, v[0]: 1, w[0]: 1,
        e[1]: order, u[1]: order - 1,
        v[1]: order - 1, w[1]: order - 2,
    }


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    return sp.expand(
        sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)
    )


def edgeless_rules(rows, order):
    return {
        row[rank]: choose(order - removed, rank)
        for row, removed in zip(rows, (0, 1, 1, 2))
        for rank in range(2, 8)
    }


def main():
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected

    t = sp.Symbol("t", integer=True, nonnegative=True)
    n = sp.Symbol("n", integer=True, positive=True)
    h = sp.Symbol("h", nonnegative=True)
    components = build_expressions()
    complete = sp.expand(
        components["g2"] + components["F"] + components["QHL"]
        + components["QHJ"] + components["QKJ"] + components["T"]
    )
    rrows, srows, xrows, yrows = (
        symbolic_rows(prefix) for prefix in "RSXY"
    )

    collision = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(srows, t, 7), L=srows,
    )
    collision = sp.expand(collision.subs(
        structural(rrows, n) | structural(srows, n - 1)
        | edgeless_rules(rrows, n) | edgeless_rules(srows, n - 1)
    ))

    distinct = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(xrows, t, 7), L=yrows,
    )
    distinct = sp.expand(distinct.subs(
        structural(rrows, n) | structural(srows, n - 1)
        | structural(xrows, n - 1) | structural(yrows, n - 2)
        | edgeless_rules(rrows, n) | edgeless_rules(srows, n - 1)
        | edgeless_rules(xrows, n - 1) | edgeless_rules(yrows, n - 2)
    ))

    certificates = {}
    for mode, value in (("collision", collision), ("distinct", distinct)):
        expected = EXPECTED[mode]
        shifted_expression = sp.expand(value.subs(n, expected["first_order"] + h))
        polynomial = sp.Poly(shifted_expression, h, t)
        coefficients = polynomial.coeffs()
        assert expression_sha256(value) == expected["raw_sha256"]
        assert expression_sha256(shifted_expression) == expected["shifted_sha256"]
        assert len(polynomial.terms()) == expected["terms"]
        assert all(coefficient >= 0 for coefficient in coefficients)
        assert min(coefficients) == expected["minimum"]
        certificates[mode] = {
            "core_order": (
                f"n>={expected['first_order']}; n={expected['first_order']}+h"
            ),
            "sibling_count": "t>=0",
            "raw_polynomial": str(sp.factor(value)),
            "raw_polynomial_sha256": expected["raw_sha256"],
            "shifted_polynomial_sha256": expected["shifted_sha256"],
            "shifted_power_terms": expected["terms"],
            "negative_shifted_coefficients": 0,
            "minimum_shifted_coefficient": str(expected["minimum"]),
        }

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "geometry": {
            "core": "R is edgeless",
            "sibling_parameter": "H=(1+x)^t R, where t>=0",
            "collision": "p=q; K=L=R-p and J=(1+x)^t(R-p)",
            "distinct": (
                "p!=q; K=R-q, J=(1+x)^t(R-p), L=R-{p,q}"
            ),
        },
        "certificates": certificates,
        "checks": {
            "both_exact_expression_hashes_match": True,
            "both_shifted_expression_hashes_match": True,
            "both_shifted_power_polynomials_coefficientwise_nonnegative": True,
            "both_minimum_coefficients_equal_17_over_120": True,
        },
        "theorem": (
            "For every canonical nonadjacent singleton-ordinary deepest-support "
            "leaf configuration with edgeless post-support core R, the complete "
            "rank-six g1 leaf increment is nonnegative for every sibling count "
            "t>=0, in both p=q and p!=q cases."
        ),
        "remaining_obligation": (
            "Non-edgeless cores in the complementary low-sibling region 10t<11n, "
            "plus the other canonical rank-six g1 modes."
        ),
        "scope_guard": (
            "This does not prove the universal ordinary-leaf lemma, singleton-"
            "ordinary g1, all-five-mode rank-six g1, N6, or Problem 993."
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
        "certificates": certificates,
        "checks": report["checks"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
