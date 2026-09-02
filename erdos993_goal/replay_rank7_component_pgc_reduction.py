#!/usr/bin/env python3
"""Exact replay for the rank-seven component PGC reduction.

This proves the symbolic identity, checks every pendant instance through
total order 16 in the required rank-seven range, and verifies an explicit
tree showing that the standalone residual V7>=0 route is false.

It is a reduction and finite audit, not an all-order rank-seven theorem.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx
import sympy as sp

from replay_rank4_component_schur_payment import (
    c_polynomial,
    coeff,
    enumerate_polynomials,
    frac,
    h_reserve,
    multiply,
)
from scan_forest_iso_reserve_floor import tree_polynomial


Polynomial = tuple[int, ...]
ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank7_component_pgc_reduction_exact_20260813.json"


def q7(poly: Polynomial) -> int:
    p6, p7, p8 = (coeff(poly, rank) for rank in (6, 7, 8))
    return 14 * p7 * p7 - p6 * p7 - 16 * p6 * p8


def v7(poly: Polynomial) -> int:
    b5, b6, b7 = (coeff(poly, rank) for rank in (5, 6, 7))
    return 9 * b5 * b6 + 105 * b5 * b7 - 72 * b6 * b6


def symbolic_certificate() -> dict[str, str]:
    p6, p7, p8, b5, b6, b7, b8, c6, c7 = sp.symbols(
        "p6 p7 p8 b5 b6 b7 b8 c6 c7", positive=True
    )
    q = 14 * p7**2 - p6 * p7 - 16 * p6 * p8
    v = 9 * b5 * b6 + 105 * b5 * b7 - 72 * b6**2
    h7 = 49 * (p7**2 - p6 * p8) / p6 + 7 * (p7 - p8)
    h6 = 36 * (b6**2 - b5 * b7) / b5 + 6 * (b6 - b7)
    identity = sp.factor(
        h7
        - h6
        - sp.Rational(7, 2) * q / p6
        - sp.Rational(21, 2) * c6
        - v / (2 * b5)
    ).subs({p7: b6 + b7 + c6, p8: b7 + b8 + c7})
    assert sp.factor(identity) == 0
    return {
        "Q7": "14*p7^2-p6*p7-16*p6*p8",
        "V7": "9*b5*b6+105*b5*b7-72*b6^2",
        "identity": "H7(P)-H6(B)=7*Q7(P)/(2*p6)+21*c6/2+V7(B)/(2*b5)",
        "cleared_target": "7*b5*Q7(P)+21*c6*p6*b5+V7(B)*p6>=0",
    }


def bounded_pendant_audit() -> dict[str, object]:
    tree_counts, _, pairs, forests = enumerate_polynomials(16, 16)
    checks = 0
    negative_q = 0
    negative_v = 0
    negative_margin = 0
    minimum: tuple[Fraction, dict[str, object]] | None = None
    for component_order in range(2, 17):
        for component, deletion in pairs[component_order]:
            for common_order in range(17 - component_order):
                for common in forests[common_order]:
                    p = multiply(component, common)
                    b = multiply(deletion, common)
                    if len(p) - 1 < 12:
                        continue
                    c = c_polynomial(p, b)
                    q_value = q7(p)
                    v_value = v7(b)
                    margin = h_reserve(p, 7) - h_reserve(b, 6)
                    decomposition = (
                        Fraction(7 * q_value, 2 * coeff(p, 6))
                        + Fraction(21 * coeff(c, 6), 2)
                        + Fraction(v_value, 2 * coeff(b, 5))
                    )
                    assert margin == decomposition
                    checks += 1
                    negative_q += q_value < 0
                    negative_v += v_value < 0
                    negative_margin += margin < 0
                    item = {
                        "total_order": component_order + common_order,
                        "component_order": component_order,
                        "common_order": common_order,
                        "alpha_P": len(p) - 1,
                        "P": p,
                        "B": b,
                        "C": c,
                        "Q7_P": q_value,
                        "V7_B": v_value,
                        "margin": frac(margin),
                    }
                    if minimum is None or margin < minimum[0]:
                        minimum = (margin, item)
    assert checks == 20_375
    assert negative_q == negative_v == negative_margin == 0
    assert minimum is not None
    assert minimum[0] == Fraction(232_328_755, 43_648)
    return {
        "maximum_total_order": 16,
        "required_alpha_P_at_least": 12,
        "checks": checks,
        "negative_Q7": negative_q,
        "negative_V7": negative_v,
        "negative_margins": negative_margin,
        "minimum": minimum[1],
        "unlabeled_tree_counts": tree_counts[1:],
    }


def obstruction_certificate() -> dict[str, object]:
    graph6 = "RpCH?C@_??g??@??_?G?@O????G??G"
    tree = nx.from_graph6_bytes(graph6.encode("ascii"))
    b = tree_polynomial(tree)
    expected = (
        1, 19, 153, 683, 1854, 3156, 3353, 2150, 785, 155, 18, 1,
    )
    assert b == expected
    assert len(b) - 1 == 11
    assert v7(b) == -1_762_236

    # Generic coefficient boxes cannot replace the literal deletion
    # coupling.  The following admissible box corner has 0<=c_j<=b_j but
    # makes the cleared target negative.  It is not claimed forest-realizable.
    box_b = (
        1, 20, 171, 817, 2393, 4436, 5188, 3701, 1500, 306, 27, 1,
    )
    b5, b6, b7, b8 = box_b[5:9]
    c5, c6, c7 = b5, 0, 0
    p6 = b5 + b6 + c5
    p7 = b6 + b7 + c6
    p8 = b7 + b8 + c7
    q_value = 14 * p7 * p7 - p6 * p7 - 16 * p6 * p8
    cleared = 7 * b5 * q_value + 21 * c6 * p6 * b5 + v7(box_b) * p6
    assert q_value == -188_795_806
    assert cleared == -5_959_884_868_472
    return {
        "first_required_range_negative_residual_tree": {
            "order": 19,
            "alpha_B": 11,
            "graph6": graph6,
            "B": b,
            "V7_B": v7(b),
        },
        "coefficient_box_nogo": {
            "B": box_b,
            "box_corner": {"c5": c5, "c6": c6, "c7": c7},
            "Q7_P": q_value,
            "cleared_target": cleared,
            "warning": "box-feasible only; not claimed to be a forest deletion",
        },
    }


def main() -> int:
    report = {
        "status": "PASS_EXACT_RANK7_COMPONENT_PGC_REDUCTION_NOT_ALL_ORDER_THEOREM",
        "required_range": {
            "alpha_P_at_least": 12,
            "alpha_B_equals_alpha_P_minus_one": True,
            "alpha_B_at_least": 11,
        },
        "symbolic_certificate": symbolic_certificate(),
        "obstruction": obstruction_certificate(),
        "bounded_pendant_audit": bounded_pendant_audit(),
        "remaining_target": "prove the cleared coupled inequality for every literal component-separated forest deletion",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("pendant checks", report["bounded_pendant_audit"]["checks"])
    print("minimum", report["bounded_pendant_audit"]["minimum"]["margin"]["text"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
