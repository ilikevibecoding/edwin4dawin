#!/usr/bin/env python3
"""Exact finite rank-seven pendant-PGC census through order 18.

For a forest G with pendant edge lp, put

    P = I(G),  B = I(G-{l,p}),  P = (1+x)B + xC.

The script regenerates every distinct tree pendant pair (P0,B0), every
distinct common forest polynomial F, and checks (P0 F, B0 F).  Hence every
polynomial pendant pair of total order at most MAX_ORDER occurs (duplicates
from different factorizations are harmless).  It also performs a distinct
forest-polynomial census of the two single-row functionals Q7 and V7.

This is finite exact evidence, not an all-order theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp
from flint import fmpz_poly as Poly

from leaf_addition_pendant_monotonicity_scan import MaskIndependencePolynomial


Polynomial = tuple[int, ...]
ROOT = Path(__file__).resolve().parent
DEFAULT_REPORT = ROOT / "rank7_pgc_census_wave14_exact_20260813.json"

EXPECTED_TREE_COUNTS = (
    0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301,
    3159, 7741, 19320, 48629, 123867,
)
EXPECTED_FOREST_POLYNOMIAL_COUNTS = (
    1, 1, 2, 3, 6, 10, 20, 36, 73, 142, 294, 618, 1348,
    2974, 6777, 15739, 37524, 90965, 224562,
)


def coeff(poly: Polynomial, rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def multiply(left: Polynomial, right: Polynomial) -> Polynomial:
    return tuple(int(value) for value in Poly(list(left)) * Poly(list(right)))


def q7(poly: Polynomial) -> int:
    p6, p7, p8 = (coeff(poly, rank) for rank in (6, 7, 8))
    return 14 * p7 * p7 - p6 * p7 - 16 * p6 * p8


def v7(poly: Polynomial) -> int:
    b5, b6, b7 = (coeff(poly, rank) for rank in (5, 6, 7))
    return 9 * b5 * b6 + 105 * b5 * b7 - 72 * b6 * b6


def h(poly: Polynomial, rank: int) -> Fraction:
    previous = coeff(poly, rank - 1)
    current = coeff(poly, rank)
    following = coeff(poly, rank + 1)
    return (
        Fraction(rank * rank * (current * current - previous * following), previous)
        + rank * (current - following)
    )


def component_count(poly: Polynomial) -> int:
    """Recover the number of components of a forest from i1 and i2."""

    order = coeff(poly, 1)
    return order - comb(order, 2) + coeff(poly, 2)


def rational(value: Fraction) -> dict[str, object]:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "text": str(value),
        "decimal": float(value),
    }


def symbolic_certificate() -> dict[str, str]:
    p6, p7, p8, b5, b6, b7, b8, c6, c7 = sp.symbols(
        "p6 p7 p8 b5 b6 b7 b8 c6 c7", positive=True
    )
    h7 = 49 * (p7**2 - p6 * p8) / p6 + 7 * (p7 - p8)
    h6 = 36 * (b6**2 - b5 * b7) / b5 + 6 * (b6 - b7)
    q = 14 * p7**2 - p6 * p7 - 16 * p6 * p8
    v = 9 * b5 * b6 + 105 * b5 * b7 - 72 * b6**2
    expression = h7 - h6 - sp.Rational(7, 2) * q / p6
    expression -= sp.Rational(21, 2) * c6 + v / (2 * b5)
    assert sp.factor(expression.subs({
        p7: b6 + b7 + c6,
        p8: b7 + b8 + c7,
    })) == 0
    return {
        "cutoff": "rank 7 is required iff 7<floor((2*alpha(P)+1)/3), hence alpha(P)>=12",
        "alpha_relation": "alpha(B)=alpha(P)-1, hence required alpha(B)>=11",
        "Q7": "14*p7^2-p6*p7-16*p6*p8",
        "V7": "9*b5*b6+105*b5*b7-72*b6^2",
        "identity": "H7(P)-H6(B)=7*Q7(P)/(2*p6)+21*c6/2+V7(B)/(2*b5)",
        "cleared": "7*b5*Q7(P)+21*c6*p6*b5+V7(B)*p6",
    }


def enumerate_rows(max_order: int):
    tree_polynomials: list[set[Polynomial]] = [set() for _ in range(max_order + 1)]
    pendant_pairs: list[set[tuple[Polynomial, Polynomial]]] = [
        set() for _ in range(max_order + 1)
    ]
    tree_counts = [0] * (max_order + 1)
    tree_polynomials[1].add((1, 1))
    tree_counts[1] = 1

    for order in range(2, max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            tree_counts[order] += 1
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = engine.polynomial(full_mask)
            tree_polynomials[order].add(full)
            for leaf in (vertex for vertex in tree if tree.degree(vertex) == 1):
                support = next(iter(tree.neighbors(leaf)))
                deletion_mask = (
                    full_mask
                    ^ (1 << engine.position[leaf])
                    ^ (1 << engine.position[support])
                )
                pendant_pairs[order].add((full, engine.polynomial(deletion_mask)))
            engine.polynomial.cache_clear()
        assert tree_counts[order] == EXPECTED_TREE_COUNTS[order]
        print(
            f"trees order={order} unlabeled={tree_counts[order]} "
            f"polynomials={len(tree_polynomials[order])} "
            f"pendant_pairs={len(pendant_pairs[order])}",
            flush=True,
        )

    forests: list[set[Polynomial]] = [set() for _ in range(max_order + 1)]
    forests[0].add((1,))
    for order in range(1, max_order + 1):
        current: set[Polynomial] = set()
        for component_order in range(1, order + 1):
            for component in tree_polynomials[component_order]:
                component_poly = Poly(list(component))
                for rest in forests[order - component_order]:
                    current.add(tuple(int(value) for value in component_poly * Poly(list(rest))))
        forests[order] = current
        assert len(current) == EXPECTED_FOREST_POLYNOMIAL_COUNTS[order]
        print(f"forests order={order} polynomials={len(current)}", flush=True)

    return tree_counts, tree_polynomials, pendant_pairs, forests


def update_integer_minimum(
    current: tuple[int, dict[str, object]] | None,
    value: int,
    item: dict[str, object],
) -> tuple[int, dict[str, object]]:
    if current is None or value < current[0]:
        return value, item
    return current


def forest_functional_census(forests: list[set[Polynomial]], max_order: int) -> dict[str, object]:
    summaries: dict[str, dict[str, object]] = {}
    minima: dict[str, tuple[int, dict[str, object]] | None] = {
        "Q7_required_alpha_at_least_12": None,
        "V7_required_alpha_at_least_11": None,
    }
    required_checks = {
        "Q7_required_alpha_at_least_12": 0,
        "V7_required_alpha_at_least_11": 0,
    }
    required_negative = {
        "Q7_required_alpha_at_least_12": 0,
        "V7_required_alpha_at_least_11": 0,
    }

    for order in range(1, max_order + 1):
        for poly in forests[order]:
            alpha = len(poly) - 1
            components = component_count(poly)
            assert 1 <= components <= order
            for name, value, threshold in (
                ("Q7", q7(poly), 12),
                ("V7", v7(poly), 11),
            ):
                if alpha >= threshold:
                    key = f"{name}_required_alpha_at_least_{threshold}"
                    required_checks[key] += 1
                    item = {
                        "value": value,
                        "order": order,
                        "alpha": alpha,
                        "components": components,
                        "polynomial": poly,
                    }
                    minima[key] = update_integer_minimum(minima[key], value, item)
                    if value < 0:
                        required_negative[key] += 1
                if value < 0:
                    group_key = f"{name}|alpha={alpha}|order={order}|components={components}"
                    group = summaries.setdefault(group_key, {
                        "functional": name,
                        "alpha": alpha,
                        "order": order,
                        "components": components,
                        "distinct_rows": 0,
                        "minimum": None,
                    })
                    group["distinct_rows"] = int(group["distinct_rows"]) + 1
                    candidate = {"value": value, "polynomial": poly}
                    if group["minimum"] is None or value < group["minimum"]["value"]:
                        group["minimum"] = candidate

    assert all(item is not None for item in minima.values())
    return {
        "required_checks": required_checks,
        "required_negative_rows": required_negative,
        "required_minima": {name: item[1] for name, item in minima.items()},
        "all_negative_row_classification": sorted(
            summaries.values(),
            key=lambda item: (item["functional"], item["alpha"], item["order"], item["components"]),
        ),
    }


def better_fraction(
    candidate_num: int,
    candidate_den: int,
    current: tuple[int, int, dict[str, object]] | None,
) -> bool:
    return current is None or candidate_num * current[1] < current[0] * candidate_den


def pendant_census(
    pairs: list[set[tuple[Polynomial, Polynomial]]],
    forests: list[set[Polynomial]],
    max_order: int,
) -> dict[str, object]:
    product_instances = 0
    analytic_instances = 0
    required_instances = 0
    required_by_order: dict[int, dict[str, object]] = {}
    required_by_alpha: dict[int, dict[str, object]] = {}
    all_negative_rows: dict[tuple[Polynomial, Polynomial], dict[str, object]] = {}
    required_negative_rows: dict[tuple[Polynomial, Polynomial], dict[str, object]] = {}
    all_q_negative_rows: set[Polynomial] = set()
    all_v_negative_rows: set[Polynomial] = set()
    required_q_negative_rows: set[Polynomial] = set()
    required_v_negative_rows: set[Polynomial] = set()
    global_minimum: tuple[int, int, dict[str, object]] | None = None

    def empty_bucket() -> dict[str, object]:
        return {
            "instances": 0,
            "Q7_negative_instances": 0,
            "V7_negative_instances": 0,
            "residual_negative_instances": 0,
            "minimum_margin": None,
        }

    for component_order in range(2, max_order + 1):
        for component, deletion in pairs[component_order]:
            for common_order in range(0, max_order - component_order + 1):
                total_order = component_order + common_order
                for common in forests[common_order]:
                    product_instances += 1
                    full = multiply(component, common)
                    reduced = multiply(deletion, common)
                    alpha = len(full) - 1
                    assert len(reduced) - 1 == alpha - 1
                    if alpha < 6:
                        continue
                    analytic_instances += 1
                    p6 = coeff(full, 6)
                    b5 = coeff(reduced, 5)
                    assert p6 > 0 and b5 > 0
                    c6 = coeff(full, 7) - coeff(reduced, 7) - coeff(reduced, 6)
                    assert c6 >= 0
                    value_q = q7(full)
                    value_v = v7(reduced)
                    numerator = 7 * b5 * value_q + 21 * c6 * p6 * b5 + value_v * p6
                    denominator = 2 * p6 * b5
                    if value_q < 0:
                        all_q_negative_rows.add(full)
                    if value_v < 0:
                        all_v_negative_rows.add(reduced)
                    if numerator < 0:
                        key = (full, reduced)
                        row = all_negative_rows.setdefault(key, {
                            "total_order": total_order,
                            "alpha_P": alpha,
                            "alpha_B": alpha - 1,
                            "components_P": component_count(full),
                            "full": full,
                            "reduced": reduced,
                            "Q7": value_q,
                            "V7": value_v,
                            "c6": c6,
                            "cleared_numerator": numerator,
                            "margin": rational(Fraction(numerator, denominator)),
                            "occurrences": 0,
                        })
                        row["occurrences"] = int(row["occurrences"]) + 1

                    if alpha < 12:
                        continue
                    required_instances += 1
                    by_order = required_by_order.setdefault(total_order, empty_bucket())
                    by_alpha = required_by_alpha.setdefault(alpha, empty_bucket())
                    item = {
                        "total_order": total_order,
                        "component_order": component_order,
                        "common_order": common_order,
                        "alpha_P": alpha,
                        "alpha_B": alpha - 1,
                        "components_P": component_count(full),
                        "full": full,
                        "reduced": reduced,
                        "common": common,
                        "Q7": value_q,
                        "V7": value_v,
                        "c6": c6,
                        "cleared_numerator": numerator,
                        "margin": rational(Fraction(numerator, denominator)),
                    }
                    for bucket in (by_order, by_alpha):
                        bucket["instances"] = int(bucket["instances"]) + 1
                        if value_q < 0:
                            bucket["Q7_negative_instances"] = int(bucket["Q7_negative_instances"]) + 1
                        if value_v < 0:
                            bucket["V7_negative_instances"] = int(bucket["V7_negative_instances"]) + 1
                        if numerator < 0:
                            bucket["residual_negative_instances"] = int(bucket["residual_negative_instances"]) + 1
                        old = bucket["minimum_margin"]
                        if old is None or numerator * old["margin"]["denominator"] < old["margin"]["numerator"] * denominator:
                            bucket["minimum_margin"] = item
                    if value_q < 0:
                        required_q_negative_rows.add(full)
                    if value_v < 0:
                        required_v_negative_rows.add(reduced)
                    if numerator < 0:
                        key = (full, reduced)
                        required_negative_rows[key] = all_negative_rows[key]
                    if better_fraction(numerator, denominator, global_minimum):
                        global_minimum = (numerator, denominator, item)

        print(
            f"pendant component_order={component_order} "
            f"product_instances={product_instances} required={required_instances}",
            flush=True,
        )

    assert global_minimum is not None
    # Independently replay the rational identity at every reported minimum.
    minimum_item = global_minimum[2]
    assert h(tuple(minimum_item["full"]), 7) - h(tuple(minimum_item["reduced"]), 6) == Fraction(
        global_minimum[0], global_minimum[1]
    )

    def negative_classification(rows: dict[tuple[Polynomial, Polynomial], dict[str, object]]):
        groups: dict[tuple[int, int, int], dict[str, object]] = {}
        for row in rows.values():
            key = (row["alpha_P"], row["total_order"], row["components_P"])
            group = groups.setdefault(key, {
                "alpha_P": key[0],
                "total_order": key[1],
                "components_P": key[2],
                "distinct_rows": 0,
                "occurrences": 0,
                "most_negative": None,
            })
            group["distinct_rows"] = int(group["distinct_rows"]) + 1
            group["occurrences"] = int(group["occurrences"]) + int(row["occurrences"])
            old = group["most_negative"]
            if old is None or row["margin"]["numerator"] * old["margin"]["denominator"] < old["margin"]["numerator"] * row["margin"]["denominator"]:
                group["most_negative"] = row
        return sorted(groups.values(), key=lambda item: (item["alpha_P"], item["total_order"], item["components_P"]))

    return {
        "product_instances": product_instances,
        "analytic_instances_alpha_P_at_least_6": analytic_instances,
        "required_instances_alpha_P_at_least_12": required_instances,
        "required_distinct_Q7_negative_full_rows": len(required_q_negative_rows),
        "required_distinct_V7_negative_reduced_rows": len(required_v_negative_rows),
        "required_distinct_residual_negative_pairs": len(required_negative_rows),
        "all_alpha_distinct_Q7_negative_full_rows": len(all_q_negative_rows),
        "all_alpha_distinct_V7_negative_reduced_rows": len(all_v_negative_rows),
        "all_alpha_distinct_residual_negative_pairs": len(all_negative_rows),
        "required_global_minimum": global_minimum[2],
        "required_by_total_order": [
            {"total_order": key, **value} for key, value in sorted(required_by_order.items())
        ],
        "required_by_alpha": [
            {"alpha_P": key, **value} for key, value in sorted(required_by_alpha.items())
        ],
        "all_alpha_negative_residual_classification": negative_classification(all_negative_rows),
        "required_negative_residual_classification": negative_classification(required_negative_rows),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=18)
    parser.add_argument("--output", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()
    assert 2 <= args.max_order <= 18

    started = time.perf_counter()
    symbolic = symbolic_certificate()
    enumeration_started = time.perf_counter()
    tree_counts, tree_polynomials, pairs, forests = enumerate_rows(args.max_order)
    enumeration_seconds = time.perf_counter() - enumeration_started
    forest_started = time.perf_counter()
    forest_census = forest_functional_census(forests, args.max_order)
    forest_seconds = time.perf_counter() - forest_started
    pendant_started = time.perf_counter()
    pendants = pendant_census(pairs, forests, args.max_order)
    pendant_seconds = time.perf_counter() - pendant_started

    status = "PASS_EXACT_FINITE_RANK7_PGC_CENSUS_THROUGH_ORDER_18_NOT_THEOREM"
    if args.max_order != 18:
        status = f"PASS_EXACT_FINITE_RANK7_PGC_CENSUS_THROUGH_ORDER_{args.max_order}_NOT_THEOREM"
    report = {
        "status": status,
        "scope": {
            "maximum_total_order": args.max_order,
            "polynomial_complete": True,
            "coverage_reason": (
                "every forest pendant pair is a tree-component pendant pair "
                "times the independence polynomial of the remaining forest"
            ),
            "warning": "finite exact evidence only; no all-order claim",
        },
        "symbolic": symbolic,
        "counts": {
            "unlabeled_trees_by_order": tree_counts[1:],
            "tree_polynomials_by_order": [len(rows) for rows in tree_polynomials[1:]],
            "tree_pendant_pairs_by_order": [len(rows) for rows in pairs[1:]],
            "forest_polynomials_by_order": [len(rows) for rows in forests],
        },
        "forest_functionals": forest_census,
        "pendant_pairs_with_common_factors": pendants,
        "timing_seconds": {
            "enumeration": enumeration_seconds,
            "forest_functionals": forest_seconds,
            "pendant_products": pendant_seconds,
            "total": time.perf_counter() - started,
        },
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(status)
    print(
        f"required_instances={pendants['required_instances_alpha_P_at_least_12']} "
        f"Q7_negative={pendants['required_distinct_Q7_negative_full_rows']} "
        f"V7_negative={pendants['required_distinct_V7_negative_reduced_rows']} "
        f"residual_negative={pendants['required_distinct_residual_negative_pairs']}",
        flush=True,
    )
    print(f"minimum_margin={pendants['required_global_minimum']['margin']['text']}")
    print(f"script_sha256={hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}")
    print(f"report_sha256={hashlib.sha256(args.output.read_bytes()).hexdigest().upper()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
