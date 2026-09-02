#!/usr/bin/env python3
"""Audit every rooted pendant extension of the first negative V7 trees.

The input rows are the complete exact list of connected-tree polynomials of
orders 19 and 20 for which alpha=11 and V7<0, as produced by
``scan_rank7_forest_residual_n20.py``.  Every tree realizing one of those
rows is enumerated, and every root is tested in the literal coupling

    B=I(T), C=I(T-s), P=(1+x)B+xC.

The untouched case C=B (a disjoint K2 pendant component) is also tested.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import MaskIndependencePolynomial
from scan_forest_iso_reserve_floor import tree_polynomial


ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "rank7_forest_residual_n20_exact_20260813.json"
REPORT = ROOT / "rank7_negative_v7_rooted_extensions_exact_20260813.json"


def coeff(poly: tuple[int, ...], rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def q7(poly: tuple[int, ...]) -> int:
    return 14 * coeff(poly, 7) ** 2 - coeff(poly, 6) * coeff(poly, 7) - 16 * coeff(poly, 6) * coeff(poly, 8)


def v7(poly: tuple[int, ...]) -> int:
    return 9 * coeff(poly, 5) * coeff(poly, 6) + 105 * coeff(poly, 5) * coeff(poly, 7) - 72 * coeff(poly, 6) ** 2


def h(poly: tuple[int, ...], rank: int) -> Fraction:
    previous = coeff(poly, rank - 1)
    current = coeff(poly, rank)
    following = coeff(poly, rank + 1)
    return Fraction(rank * rank * (current * current - previous * following), previous) + rank * (current - following)


def full_polynomial(b: tuple[int, ...], c: tuple[int, ...]) -> tuple[int, ...]:
    degree = max(len(b), len(c) + 1)
    values = []
    for rank in range(degree + 1):
        values.append(coeff(b, rank) + coeff(b, rank - 1) + coeff(c, rank - 1))
    while len(values) > 1 and values[-1] == 0:
        values.pop()
    return tuple(values)


def fraction_record(value: Fraction) -> dict[str, object]:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "text": str(value),
        "decimal": float(value),
    }


def main() -> int:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    rows = source["required_range_negative_rows"]["V7"]
    targets: dict[int, set[tuple[int, ...]]] = {}
    for row in rows:
        if "connected" not in " ".join(row["sources"]):
            continue
        targets.setdefault(row["order"], set()).add(tuple(row["polynomial"]))
    assert {order: len(values) for order, values in targets.items()} == {19: 7, 20: 8}

    tree_counts = {}
    target_tree_counts = {}
    rooted_checks = 0
    untouched_checks = 0
    distinct_rooted_pairs: set[tuple[tuple[int, ...], tuple[int, ...]]] = set()
    minimum: tuple[Fraction, dict[str, object]] | None = None
    minimum_q: tuple[int, dict[str, object]] | None = None
    negative_q = 0
    negative_margins = 0
    realizations: dict[tuple[int, ...], list[str]] = {}

    def audit(b: tuple[int, ...], c: tuple[int, ...], record: dict[str, object]) -> None:
        nonlocal rooted_checks, untouched_checks, minimum, minimum_q, negative_q, negative_margins
        p = full_polynomial(b, c)
        assert len(b) - 1 == 11 and len(p) - 1 == 12
        q_value = q7(p)
        v_value = v7(b)
        margin = h(p, 7) - h(b, 6)
        decomposition = (
            Fraction(7 * q_value, 2 * coeff(p, 6))
            + Fraction(21 * coeff(c, 6), 2)
            + Fraction(v_value, 2 * coeff(b, 5))
        )
        assert margin == decomposition
        item = {
            **record,
            "B": b,
            "C": c,
            "P": p,
            "Q7_P": q_value,
            "V7_B": v_value,
            "c6": coeff(c, 6),
            "margin": fraction_record(margin),
        }
        if record["kind"] == "rooted":
            rooted_checks += 1
            distinct_rooted_pairs.add((b, c))
        else:
            untouched_checks += 1
        negative_q += q_value < 0
        negative_margins += margin < 0
        if minimum is None or margin < minimum[0]:
            minimum = (margin, item)
        if minimum_q is None or q_value < minimum_q[0]:
            minimum_q = (q_value, item)

    for order in (19, 20):
        total = 0
        target_trees = 0
        untouched_seen: set[tuple[int, ...]] = set()
        for tree in nx.nonisomorphic_trees(order):
            total += 1
            b = tree_polynomial(tree)
            if b not in targets[order]:
                continue
            target_trees += 1
            graph6 = nx.to_graph6_bytes(tree, header=False).decode("ascii").strip()
            realizations.setdefault(b, []).append(graph6)
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            for root in tree:
                c = engine.polynomial(full_mask ^ (1 << engine.position[root]))
                audit(b, c, {
                    "kind": "rooted",
                    "order_B": order,
                    "graph6_B": graph6,
                    "root": root,
                    "root_degree": tree.degree(root),
                })
            engine.polynomial.cache_clear()
            if b not in untouched_seen:
                untouched_seen.add(b)
                audit(b, b, {
                    "kind": "untouched_disjoint_K2",
                    "order_B": order,
                    "graph6_B": graph6,
                    "root": None,
                    "root_degree": None,
                })
        tree_counts[order] = total
        target_tree_counts[order] = target_trees
        print("order", order, "trees", total, "target trees", target_trees, flush=True)

    assert tree_counts == {19: 317_955, 20: 823_065}
    assert rooted_checks > 0 and untouched_checks == 15
    assert minimum is not None and minimum_q is not None
    assert negative_margins == 0
    report = {
        "status": "PASS_EXACT_ALL_ROOTED_EXTENSIONS_OF_NEGATIVE_V7_CONNECTED_TREES_N19_N20",
        "scope": {
            "complete_unlabeled_tree_orders": tree_counts,
            "negative_V7_target_polynomials": {order: len(values) for order, values in targets.items()},
            "target_tree_realizations": target_tree_counts,
            "rooted_checks": rooted_checks,
            "distinct_polynomial_rooted_pairs": len(distinct_rooted_pairs),
            "untouched_disjoint_K2_checks": untouched_checks,
        },
        "result": {
            "negative_Q7_instances": negative_q,
            "negative_full_PGC_margins": negative_margins,
            "minimum_margin": minimum[1],
            "minimum_Q7": minimum_q[1],
        },
        "realizations_by_polynomial": [
            {"B": polynomial, "graph6_realizations": sorted(graphs)}
            for polynomial, graphs in sorted(realizations.items(), key=lambda item: (len(item[0]), item[0]))
        ],
        "warning": "This is a complete rooted audit only for the 15 negative-V7 connected-tree polynomial rows through order 20, not an all-order PGC proof.",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("rooted", rooted_checks, "distinct", len(distinct_rooted_pairs), "negative q", negative_q)
    print("minimum margin", minimum[0], "minimum q", minimum_q[0])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
