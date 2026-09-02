#!/usr/bin/env python3
"""Exact finite rank-eight pendant-PGC census through order 18.

For every forest G with a pendant edge lp, put

    P = I(G),  B = I(G-{l,p}),  P = (1+x)B + xC.

Every polynomial pendant pair of total order at most MAX_ORDER is a distinct
tree-component pendant pair multiplied by a distinct common forest
polynomial.  This script enumerates that complete polynomial quotient and
checks the literal rank-eight margin

    H8(P)-H7(B)
      = 4 Q8(P)/p7 + 12 c7 + V8(B)/(2 b6).

The alpha(P)=13,14 rows are reported separately because the all-forest V8
theorem for B applies directly only from alpha(P)>=15.  This is a finite exact
audit, not an all-order rank-eight theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

import replay_rank7_pgc_census_wave14 as base


Polynomial = tuple[int, ...]
ROOT = Path(__file__).resolve().parent
DEFAULT_REPORT = ROOT / "rank8_pgc_census_wave23_exact_20260817.json"


def coeff(poly: Polynomial, rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def q8(poly: Polynomial) -> int:
    p7, p8, p9 = (coeff(poly, rank) for rank in (7, 8, 9))
    return 16 * p8 * p8 - p7 * p8 - 18 * p7 * p9


def v8(poly: Polynomial) -> int:
    b6, b7, b8 = (coeff(poly, rank) for rank in (6, 7, 8))
    return 10 * b6 * b7 + 136 * b6 * b8 - 98 * b7 * b7


def h(poly: Polynomial, rank: int) -> Fraction:
    previous = coeff(poly, rank - 1)
    current = coeff(poly, rank)
    following = coeff(poly, rank + 1)
    return (
        Fraction(rank * rank * (current * current - previous * following), previous)
        + rank * (current - following)
    )


def rational(value: Fraction) -> dict[str, object]:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "text": str(value),
        "decimal": float(value),
    }


def symbolic_certificate() -> dict[str, str]:
    p7, p8, p9, b6, b7, b8, b9, c7, c8 = sp.symbols(
        "p7 p8 p9 b6 b7 b8 b9 c7 c8", positive=True
    )
    h8 = 64 * (p8**2 - p7 * p9) / p7 + 8 * (p8 - p9)
    h7 = 49 * (b7**2 - b6 * b8) / b6 + 7 * (b7 - b8)
    q = 16 * p8**2 - p7 * p8 - 18 * p7 * p9
    v = 10 * b6 * b7 + 136 * b6 * b8 - 98 * b7**2
    expression = h8 - h7 - 4 * q / p7 - 12 * c7 - v / (2 * b6)
    assert sp.factor(expression.subs({
        p8: b7 + b8 + c7,
        p9: b8 + b9 + c8,
    })) == 0
    return {
        "cutoff": "rank 8 is required iff 8<floor((2*alpha(P)+1)/3), hence alpha(P)>=13",
        "alpha_relation": "alpha(B)=alpha(P)-1",
        "separated_V8_range": "the all-forest V8(B) theorem applies directly when alpha(P)>=15",
        "Q8": "16*p8^2-p7*p8-18*p7*p9",
        "V8": "10*b6*b7+136*b6*b8-98*b7^2",
        "identity": "H8(P)-H7(B)=4*Q8(P)/p7+12*c7+V8(B)/(2*b6)",
        "cleared": "8*b6*Q8(P)+24*c7*p7*b6+V8(B)*p7",
    }


def update_integer_minimum(
    current: tuple[int, dict[str, object]] | None,
    value: int,
    item: dict[str, object],
) -> tuple[int, dict[str, object]]:
    if current is None or value < current[0]:
        return value, item
    return current


def forest_functional_census(
    forests: list[set[Polynomial]], max_order: int
) -> dict[str, object]:
    minima: dict[str, tuple[int, dict[str, object]] | None] = {
        "Q8_alpha_at_least_14": None,
        "V8_alpha_at_least_14": None,
    }
    checks = {key: 0 for key in minima}
    negatives = {key: 0 for key in minima}
    negative_groups: dict[str, dict[str, object]] = {}

    for order in range(1, max_order + 1):
        for poly in forests[order]:
            alpha = len(poly) - 1
            components = base.component_count(poly)
            for name, value, threshold in (("Q8", q8(poly), 14), ("V8", v8(poly), 14)):
                if alpha >= threshold:
                    key = f"{name}_alpha_at_least_{threshold}"
                    checks[key] += 1
                    item = {
                        "value": value,
                        "order": order,
                        "alpha": alpha,
                        "components": components,
                        "polynomial": poly,
                    }
                    minima[key] = update_integer_minimum(minima[key], value, item)
                    negatives[key] += int(value < 0)
                if value < 0:
                    group_key = f"{name}|alpha={alpha}|order={order}|components={components}"
                    group = negative_groups.setdefault(group_key, {
                        "functional": name,
                        "alpha": alpha,
                        "order": order,
                        "components": components,
                        "distinct_rows": 0,
                        "minimum": None,
                    })
                    group["distinct_rows"] = int(group["distinct_rows"]) + 1
                    if group["minimum"] is None or value < group["minimum"]["value"]:
                        group["minimum"] = {"value": value, "polynomial": poly}

    assert all(item is not None for item in minima.values())
    return {
        "checks": checks,
        "negative_required_rows": negatives,
        "required_minima": {key: value[1] for key, value in minima.items()},
        "all_negative_row_classification": sorted(
            negative_groups.values(),
            key=lambda item: (
                item["functional"], item["alpha"], item["order"], item["components"]
            ),
        ),
    }


def better_fraction(
    numerator: int,
    denominator: int,
    current: tuple[int, int, dict[str, object]] | None,
) -> bool:
    return current is None or numerator * current[1] < current[0] * denominator


def pendant_census(
    pairs: list[set[tuple[Polynomial, Polynomial]]],
    forests: list[set[Polynomial]],
    max_order: int,
) -> dict[str, object]:
    products = 0
    required = 0
    required_by_alpha: dict[int, dict[str, object]] = {}
    required_by_order: dict[int, dict[str, object]] = {}
    global_minimum: tuple[int, int, dict[str, object]] | None = None
    distinct_negative_pairs: set[tuple[Polynomial, Polynomial]] = set()
    distinct_q_negative: set[Polynomial] = set()
    distinct_v_negative: set[Polynomial] = set()

    def bucket() -> dict[str, object]:
        return {
            "instances": 0,
            "Q8_negative_instances": 0,
            "V8_negative_instances": 0,
            "coupled_negative_instances": 0,
            "minimum_margin": None,
        }

    for component_order in range(2, max_order + 1):
        for component, deletion in pairs[component_order]:
            for common_order in range(max_order - component_order + 1):
                total_order = component_order + common_order
                for common in forests[common_order]:
                    products += 1
                    full = base.multiply(component, common)
                    reduced = base.multiply(deletion, common)
                    alpha = len(full) - 1
                    assert len(reduced) - 1 == alpha - 1
                    if alpha < 13:
                        continue

                    p7 = coeff(full, 7)
                    b6 = coeff(reduced, 6)
                    assert p7 > 0 and b6 > 0
                    c7 = coeff(full, 8) - coeff(reduced, 8) - coeff(reduced, 7)
                    assert c7 >= 0
                    value_q = q8(full)
                    value_v = v8(reduced)
                    numerator = (
                        8 * b6 * value_q
                        + 24 * c7 * p7 * b6
                        + value_v * p7
                    )
                    denominator = 2 * p7 * b6
                    margin = Fraction(numerator, denominator)
                    required += 1
                    item = {
                        "total_order": total_order,
                        "component_order": component_order,
                        "common_order": common_order,
                        "alpha_P": alpha,
                        "alpha_B": alpha - 1,
                        "components_P": base.component_count(full),
                        "full": full,
                        "reduced": reduced,
                        "common": common,
                        "Q8": value_q,
                        "V8": value_v,
                        "c7": c7,
                        "cleared_numerator": numerator,
                        "margin": rational(margin),
                    }
                    if value_q < 0:
                        distinct_q_negative.add(full)
                    if value_v < 0:
                        distinct_v_negative.add(reduced)
                    if numerator < 0:
                        distinct_negative_pairs.add((full, reduced))

                    for table, key in (
                        (required_by_alpha, alpha),
                        (required_by_order, total_order),
                    ):
                        current = table.setdefault(key, bucket())
                        current["instances"] = int(current["instances"]) + 1
                        current["Q8_negative_instances"] = int(
                            current["Q8_negative_instances"]
                        ) + int(value_q < 0)
                        current["V8_negative_instances"] = int(
                            current["V8_negative_instances"]
                        ) + int(value_v < 0)
                        current["coupled_negative_instances"] = int(
                            current["coupled_negative_instances"]
                        ) + int(numerator < 0)
                        old = current["minimum_margin"]
                        if old is None or (
                            numerator * old["margin"]["denominator"]
                            < old["margin"]["numerator"] * denominator
                        ):
                            current["minimum_margin"] = item

                    if better_fraction(numerator, denominator, global_minimum):
                        global_minimum = (numerator, denominator, item)

        print(
            f"pendant component_order={component_order} products={products} "
            f"required={required}",
            flush=True,
        )

    assert global_minimum is not None
    minimum = global_minimum[2]
    assert h(tuple(minimum["full"]), 8) - h(tuple(minimum["reduced"]), 7) == Fraction(
        global_minimum[0], global_minimum[1]
    )
    return {
        "product_instances": products,
        "required_instances_alpha_P_at_least_13": required,
        "required_distinct_Q8_negative_full_rows": len(distinct_q_negative),
        "required_distinct_V8_negative_reduced_rows": len(distinct_v_negative),
        "required_distinct_coupled_negative_pairs": len(distinct_negative_pairs),
        "global_minimum": minimum,
        "by_alpha_P": [
            {"alpha_P": key, **value} for key, value in sorted(required_by_alpha.items())
        ],
        "by_total_order": [
            {"total_order": key, **value} for key, value in sorted(required_by_order.items())
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=18)
    parser.add_argument("--output", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()
    assert 14 <= args.max_order <= 18

    symbolic = symbolic_certificate()
    tree_counts, tree_polynomials, pairs, forests = base.enumerate_rows(args.max_order)
    forest_census = forest_functional_census(forests, args.max_order)
    pendants = pendant_census(pairs, forests, args.max_order)
    status = (
        f"PASS_EXACT_FINITE_RANK8_PGC_CENSUS_THROUGH_ORDER_{args.max_order}_NOT_THEOREM"
    )
    report = {
        "status": status,
        "scope": {
            "maximum_total_order": args.max_order,
            "polynomial_complete": True,
            "coverage_reason": (
                "every forest pendant pair is a tree-component pendant pair "
                "times the independence polynomial of the remaining forest"
            ),
            "boundary_rows": "alpha(P)=13,14 are included literally in the coupled margin",
            "warning": "finite exact evidence only; no all-order rank-eight claim",
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
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(status)
    print(
        f"required={pendants['required_instances_alpha_P_at_least_13']} "
        f"Q8_negative={pendants['required_distinct_Q8_negative_full_rows']} "
        f"V8_negative={pendants['required_distinct_V8_negative_reduced_rows']} "
        f"coupled_negative={pendants['required_distinct_coupled_negative_pairs']}",
        flush=True,
    )
    print(f"minimum_margin={pendants['global_minimum']['margin']['text']}")
    print(f"script_sha256={hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}")
    print(f"report_sha256={hashlib.sha256(args.output.read_bytes()).hexdigest().upper()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
