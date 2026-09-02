#!/usr/bin/env python3
"""Memory-bounded Young/AM-GM probe for a nonzero mixed-face slack group.

The FLINT polynomial is retained once, one auxiliary row at a time.  Only its
negative coefficients and actually queried positive midpoint sources enter
Python dictionaries.  This avoids duplicating a multi-million-term row.

The group restriction keeps precisely monomials in which at least one chosen
ordinary slack occurs.  Consequently every selected source is disjoint from
the sealed all-slacks-zero certificate.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from fractions import Fraction
from pathlib import Path

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import coo_array

from analyze_rank8_low_low_a23_mixed_slack_slices_agent import (
    BASE_NAMES,
    SLACK_NAMES,
    build,
)


ROOT = Path(__file__).resolve().parent
BUILDER = ROOT / "analyze_rank8_low_low_a23_mixed_slack_slices_agent.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rational_optimum(low_capacity: int, high_capacity: int) -> Fraction:
    value = Fraction.from_float(
        math.sqrt(low_capacity / high_capacity)
    ).limit_denominator(10**6)
    return value or Fraction(1, 10**6)


def ratio_menu(low_capacity: int, high_capacity: int, radius: int):
    optimum = rational_optimum(low_capacity, high_capacity)
    return [
        optimum * (
            Fraction(2**power, 1)
            if power >= 0 else Fraction(1, 2 ** (-power))
        )
        for power in range(-radius, radius + 1)
    ]


def bounded_midpoints(target, coefficient, in_group):
    """Enumerate positive L,H with L+H=2T using bounded compositions."""
    doubled = tuple(2 * value for value in target)
    total = sum(target)
    order = sorted(range(len(target)), key=lambda index: doubled[index])
    low = [0] * len(target)
    pairs = []

    def visit(position, remaining):
        if position == len(order) - 1:
            index = order[position]
            if 0 <= remaining <= doubled[index]:
                low[index] = remaining
                low_tuple = tuple(low)
                high_tuple = tuple(
                    doubled[i] - low_tuple[i] for i in range(len(target))
                )
                if (
                    low_tuple < high_tuple
                    and in_group(low_tuple)
                    and in_group(high_tuple)
                ):
                    low_coefficient = coefficient(low_tuple)
                    high_coefficient = coefficient(high_tuple)
                    if low_coefficient > 0 and high_coefficient > 0:
                        pairs.append(
                            (low_tuple, high_tuple, low_coefficient, high_coefficient)
                        )
            return
        index = order[position]
        later_max = sum(doubled[item] for item in order[position + 1:])
        lower = max(0, remaining - later_max)
        upper = min(doubled[index], remaining)
        for value in range(lower, upper + 1):
            low[index] = value
            visit(position + 1, remaining - value)

    visit(0, total)
    return pairs


def encode_fraction(value: Fraction):
    return [value.numerator, value.denominator]


def solve(face, group, label, radius, emit_allocations):
    names, rows = build(face, group, only_label=label)
    polynomial = rows[label]
    slack_start = len(BASE_NAMES)

    def in_group(monomial):
        return any(int(value) > 0 for value in monomial[slack_start:])

    negatives = {}
    group_terms = positive_terms = 0
    for monomial, raw_coefficient in polynomial.terms():
        monomial = tuple(map(int, monomial))
        if not in_group(monomial):
            continue
        coefficient = int(raw_coefficient)
        group_terms += 1
        if coefficient > 0:
            positive_terms += 1
        elif coefficient < 0:
            negatives[monomial] = -coefficient
    print(
        "ROW_COUNTS", label, group_terms, positive_terms, len(negatives),
        flush=True,
    )
    if not negatives:
        return {
            "status": "COEFFICIENTWISE_NONNEGATIVE",
            "variables": list(names),
            "group_terms": group_terms,
            "positive_terms": positive_terms,
            "negative_terms": 0,
        }

    coefficient_cache = {}

    def coefficient(monomial):
        if monomial not in coefficient_cache:
            coefficient_cache[monomial] = int(polynomial[monomial])
        return coefficient_cache[monomial]

    candidates = []
    per_target = {}
    pair_count = 0
    for target_index, target in enumerate(sorted(negatives)):
        pairs = bounded_midpoints(target, coefficient, in_group)
        per_target[target] = len(pairs)
        pair_count += len(pairs)
        for low, high, low_capacity, high_capacity in pairs:
            for ratio in ratio_menu(low_capacity, high_capacity, radius):
                candidates.append(
                    (target, low, high, ratio, low_capacity, high_capacity)
                )
        if target_index % 100 == 0 or target_index + 1 == len(negatives):
            print(
                "PAIR_PROGRESS", target_index + 1, len(negatives),
                "PAIRS", pair_count, "QUERIED", len(coefficient_cache),
                flush=True,
            )
    if min(per_target.values()) == 0:
        return {
            "status": "NO_MIDPOINT_PAIR_FOR_SOME_TARGET",
            "variables": list(names),
            "group_terms": group_terms,
            "positive_terms": positive_terms,
            "negative_terms": len(negatives),
            "uncovered_targets": [
                list(target) for target, count in per_target.items() if not count
            ],
            "midpoint_pairs": pair_count,
            "coefficient_queries": len(coefficient_cache),
        }

    targets = sorted(negatives)
    sources = sorted({
        source for _, low, high, *_ in candidates for source in (low, high)
    })
    capacities = {source: coefficient(source) for source in sources}
    assert min(capacities.values()) > 0
    target_row = {target: index for index, target in enumerate(targets)}
    source_row = {
        source: len(targets) + index for index, source in enumerate(sources)
    }
    row_indices, column_indices, values = [], [], []
    for column, (target, low, high, ratio, low_capacity, high_capacity) in enumerate(candidates):
        for row, value in (
            (target_row[target], -1.0 / negatives[target]),
            (source_row[low], float(ratio / (2 * low_capacity))),
            (source_row[high], float(1 / (2 * ratio * high_capacity))),
        ):
            row_indices.append(row)
            column_indices.append(column)
            values.append(value)
    matrix = coo_array(
        (values, (row_indices, column_indices)),
        shape=(len(targets) + len(sources), len(candidates)),
    ).tocsc()
    solution = None
    safety_used = None
    trial = None
    for safety in (1e-4, 1e-5, 1e-6, 0.0):
        bounds = np.array(
            [-(1 + safety)] * len(targets) + [(1 - safety)] * len(sources)
        )
        trial = linprog(
            np.ones(len(candidates)), A_ub=matrix, b_ub=bounds,
            bounds=(0, None), method="highs", options={"time_limit": 300},
        )
        print("LP", safety, trial.status, trial.message, flush=True)
        if trial.success:
            solution, safety_used = trial, safety
            break
    if solution is None:
        return {
            "status": "SPARSE_YOUNG_LP_INFEASIBLE",
            "variables": list(names),
            "group_terms": group_terms,
            "positive_terms": positive_terms,
            "negative_terms": len(negatives),
            "midpoint_pairs": pair_count,
            "pair_range": [min(per_target.values()), max(per_target.values())],
            "ratio_candidates": len(candidates),
            "sources": len(sources),
            "coefficient_queries": len(coefficient_cache),
            "message": trial.message,
        }

    exact = None
    for denominator in (10**6, 10**8, 10**10):
        allocations = []
        for value, block in zip(solution.x, candidates):
            if value <= 1e-10:
                continue
            payment = Fraction(math.ceil(value * denominator - 1e-12), denominator)
            if payment:
                allocations.append((payment, block))
        target_paid = {target: Fraction(0) for target in targets}
        source_used = {source: Fraction(0) for source in sources}
        for payment, (target, low, high, ratio, _, _) in allocations:
            target_paid[target] += payment
            source_used[low] += payment * ratio / 2
            source_used[high] += payment / (2 * ratio)
        if (
            all(target_paid[target] >= negatives[target] for target in targets)
            and all(source_used[source] <= capacities[source] for source in sources)
        ):
            exact = (denominator, allocations, target_paid, source_used)
            break
    if exact is None:
        return {
            "status": "SPARSE_FLOATING_PASS_EXACT_ROUNDING_FAIL",
            "variables": list(names),
            "negative_terms": len(negatives),
            "ratio_candidates": len(candidates),
        }
    denominator, allocations, target_paid, source_used = exact
    result = {
        "status": "PASS_EXACT_SPARSE_POSITIVE_SUPPORT_YOUNG_AMGM",
        "variables": list(names),
        "group_terms": group_terms,
        "positive_terms": positive_terms,
        "negative_terms": len(negatives),
        "midpoint_pairs": pair_count,
        "pair_range": [min(per_target.values()), max(per_target.values())],
        "ratio_radius": radius,
        "ratio_candidates": len(candidates),
        "sources": len(sources),
        "coefficient_queries": len(coefficient_cache),
        "allocations_used": len(allocations),
        "rational_grid_denominator": denominator,
        "floating_safety": safety_used,
        "minimum_target_surplus": encode_fraction(
            min(target_paid[target] - negatives[target] for target in targets)
        ),
        "minimum_source_reserve": encode_fraction(
            min(capacities[source] - source_used[source] for source in sources)
        ),
        "all_sources_have_positive_group_support": all(in_group(source) for source in sources),
    }
    if emit_allocations:
        result["allocations"] = [
            {
                "target": list(target),
                "demand": negatives[target],
                "payment": encode_fraction(payment),
                "source_low": list(low),
                "source_high": list(high),
                "ratio_r": encode_fraction(ratio),
                "low_capacity": low_capacity,
                "high_capacity": high_capacity,
                "low_cost": encode_fraction(payment * ratio / 2),
                "high_cost": encode_fraction(payment / (2 * ratio)),
            }
            for payment, (
                target, low, high, ratio, low_capacity, high_capacity
            ) in allocations
        ]
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--group", required=True)
    parser.add_argument(
        "--label",
        choices=(
            "curvature_middle_times_4", "curvature_far",
            "strong_middle_times_4", "strong_far",
        ),
        required=True,
    )
    parser.add_argument("--ratio-radius", type=int, choices=range(7), default=1)
    parser.add_argument("--emit-allocations", action="store_true")
    parser.add_argument("--output")
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    group = tuple(filter(None, args.group.split(",")))
    assert len(set(group)) == len(group) and set(group) <= set(SLACK_NAMES)
    result = solve(
        face, group, args.label, args.ratio_radius, args.emit_allocations
    )
    payload = {
        "schema": "rank8-low-low-a23-mixed-group-sparse-young-agent-v1",
        "face": list(face),
        "ordinary_slack_group": list(group),
        "group_rule": "retain exactly monomials with positive support in this group",
        "auxiliary": args.label,
        **result,
        "builder_sha256": sha256(BUILDER),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(payload, indent=2) + "\n"
    if args.output:
        output = Path(args.output).resolve()
        temporary = output.with_suffix(output.suffix + ".tmp")
        temporary.write_text(encoded, encoding="utf-8")
        os.replace(temporary, output)
        print("OUTPUT", output, sha256(output), flush=True)
    print(encoded, end="", flush=True)


if __name__ == "__main__":
    main()
