#!/usr/bin/env python3
"""Exact stress test of rank-three component variance on caterpillars."""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from math import comb
from pathlib import Path


def evaluate(leaves: list[int]) -> dict:
    spine = len(leaves)
    degrees = [
        count + int(index > 0) + int(index + 1 < spine)
        for index, count in enumerate(leaves)
    ]
    order = spine + sum(leaves)
    rows = []
    for index, count in enumerate(leaves):
        degree = degrees[index]
        h = order - 1 - degree
        if h:
            neighbor_degree_sum = count
            if index > 0:
                neighbor_degree_sum += degrees[index - 1]
            if index + 1 < spine:
                neighbor_degree_sum += degrees[index + 1]
            components = neighbor_degree_sum - degree
            a_value = (
                Fraction(h - 3)
                + Fraction(2 * components, h)
            )
            rows.append((1, h, a_value, components))
        if count:
            h = order - 2
            components = degree - 1
            a_value = (
                Fraction(h - 3)
                + Fraction(2 * components, h)
            )
            rows.append((count, h, a_value, components))

    mass = sum(multiplicity * h for multiplicity, h, _, _ in rows)
    mean_a = sum(
        multiplicity * h * a_value
        for multiplicity, h, a_value, _ in rows
    ) / mass
    variance_a = (
        sum(
            multiplicity * h * a_value * a_value
            for multiplicity, h, a_value, _ in rows
        )
        / mass
        - mean_a**2
    )
    mean_components = sum(
        Fraction(multiplicity * h * components, mass)
        for multiplicity, h, _, components in rows
    )
    slack = 1 + mean_components - variance_a

    incident_edge_pairs = sum(comb(degree, 2) for degree in degrees)
    i2 = comb(order, 2) - (order - 1)
    i3 = (
        comb(order, 3)
        - (order - 1) * (order - 2)
        + incident_edge_pairs
    )
    return {
        "order": order,
        "rank_three_is_rising": i3 > i2,
        "variance_A": str(variance_a),
        "mean_components": str(mean_components),
        "component_variance_slack": str(slack),
        "component_variance_slack_decimal": float(slack),
        "mean_A": str(mean_a),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trials", type=int, default=100_000)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--maximum-spine", type=int, default=12)
    parser.add_argument("--maximum-leaves", type=int, default=60)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    checked = rising = failures = 0
    best = None

    candidates = (
        [left, right]
        for left in range(1, 31)
        for right in range(1, 31)
    )
    for leaves in candidates:
        result = evaluate(leaves)
        checked += 1
        rising += int(result["rank_three_is_rising"])
        if not result["rank_three_is_rising"]:
            continue
        slack = Fraction(result["component_variance_slack"])
        if slack < 0:
            failures += 1
        if best is None or slack < best[0]:
            best = (slack, leaves, result)

    for _ in range(args.trials):
        spine = rng.randint(2, args.maximum_spine)
        leaves = [
            rng.randint(0, args.maximum_leaves)
            for _ in range(spine)
        ]
        if sum(leaves) < 2:
            continue
        result = evaluate(leaves)
        checked += 1
        rising += int(result["rank_three_is_rising"])
        if not result["rank_three_is_rising"]:
            continue
        slack = Fraction(result["component_variance_slack"])
        if slack < 0:
            failures += 1
        if best is None or slack < best[0]:
            best = (slack, leaves, result)

    if best is None:
        raise AssertionError("no rising caterpillar was tested")
    report = {
        "status": (
            "NO_COMPONENT_VARIANCE_FAILURE_FOUND"
            if failures == 0
            else "COMPONENT_VARIANCE_FAILURE_FOUND"
        ),
        "scope": (
            "Exact rational rank-three audit of a deterministic "
            "two-hub grid and seeded random multi-hub caterpillars; "
            "not a general proof."
        ),
        "parameters": {
            "trials": args.trials,
            "seed": args.seed,
            "maximum_spine": args.maximum_spine,
            "maximum_leaves": args.maximum_leaves,
        },
        "checked": checked,
        "rising_checks": rising,
        "failures": failures,
        "minimum_slack": {
            "exact": str(best[0]),
            "decimal": float(best[0]),
            "leaves_by_spine_vertex": best[1],
            **best[2],
        },
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
