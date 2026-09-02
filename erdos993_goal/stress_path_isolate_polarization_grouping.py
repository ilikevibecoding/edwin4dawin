#!/usr/bin/env python3
"""Exact numeric stress test of the proposed polarization grouping.

For the stable path terminal, let P(a,b) be the symmetric quadratic
polarization between isolate-binomial input layers a and b.  The
observed sufficient grouping for every output layer j is

  P(0,1) >= 0,
  P(a,b) >= 0                         (1 <= a <= b),
  P(0,j) + j P(1,j-1) >= 0           (j >= 2).

Indeed, the subset-union linearization coefficient of P(0,j) is one
and that of P(1,j-1) is j; all remaining output-layer terms have both
indices positive.  A proof of these three statements would establish
the all-rank stable path-plus-isolates theorem in one step.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import sympy as sp

import derive_path_isolate_layer_direct as direct
from analyze_path_isolate_pair_polarizations import ordered_pair


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if k >= 0 and n >= k else 0


def numeric_path_row(order: int, rank: int) -> tuple[int, ...]:
    if rank < 0:
        return (0, 0, 0, 0)
    count = choose(order - rank + 1, rank)
    mass = (rank + 1) * choose(order - rank, rank + 1)
    edges = (rank + 1) * choose(
        order - rank - 1, rank + 1
    )
    square = (
        mass
        + (rank + 1)
        * (rank + 2)
        * choose(order - rank - 1, rank + 2)
        + 2 * edges
    )
    return (count, mass, square, mass - edges)


def numeric_path_row_series(
    order: int, rank: int, maximum: int
):
    rows = {
        shift: numeric_path_row(order, rank - shift)
        for shift in range(maximum + 1)
    }
    result = [[], [], [], []]
    for layer in range(maximum + 1):
        n, s, h, c = rows[layer]
        previous = rows.get(layer - 1, (0, 0, 0, 0))
        previous2 = rows.get(layer - 2, (0, 0, 0, 0))
        result[0].append(n)
        result[1].append(s + layer * previous[0])
        result[2].append(
            h
            + 2 * layer * previous[1]
            + layer * previous[0]
            + layer * (layer - 1) * previous2[0]
        )
        result[3].append(c + layer * previous[0])
    return tuple(tuple(sequence) for sequence in result)


def polarization(states, a: int, b: int) -> int:
    value = 0
    for name, sign in (("new", 1), ("old", -1), ("lower", -1)):
        state = states[name]
        value += sign * ordered_pair(state, a, b)
        if a != b:
            value += sign * ordered_pair(state, b, a)
    return int(value)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--q-max", type=int, default=24)
    parser.add_argument("--layer-max", type=int, default=16)
    parser.add_argument("--x-max", type=int, default=12)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    failures = []
    checks = 0
    minima = {
        "P01": None,
        "positive_pair": None,
        "grouped_zero_pair": None,
    }

    def record(
        family: str,
        value: int,
        q: int,
        x: int,
        layers: tuple[int, ...],
    ) -> None:
        nonlocal checks
        checks += 1
        item = {
            "family": family,
            "q": q,
            "x": x,
            "layers": list(layers),
            "value": value,
        }
        if minima[family] is None or value < minima[family][0]:
            minima[family] = (value, item)
        if value < 0:
            failures.append(item)

    try:
        for q in range(4, args.q_max + 1):
            maximum = min(args.layer_max, 2 * q - 2)
            for x in range(args.x_max + 1):
                length = 2 * q - 4 + x
                states = direct.terminal_series(
                    q, length, maximum, return_states=True
                )
                pair_cache = {}

                def pair(a: int, b: int) -> int:
                    tag = (min(a, b), max(a, b))
                    if tag not in pair_cache:
                        pair_cache[tag] = polarization(
                            states, *tag
                        )
                    return pair_cache[tag]

                if maximum >= 1:
                    record("P01", pair(0, 1), q, x, (0, 1))
                for a in range(1, maximum + 1):
                    for b in range(a, maximum + 1):
                        record(
                            "positive_pair",
                            pair(a, b),
                            q,
                            x,
                            (a, b),
                        )
                for layer in range(2, maximum + 1):
                    record(
                        "grouped_zero_pair",
                        pair(0, layer)
                        + layer * pair(1, layer - 1),
                        q,
                        x,
                        (0, layer, 1, layer - 1),
                    )
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_POLARIZATION_GROUPING_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_POLARIZATION_GROUPING_STRESS"
        ),
        "q_range": f"4..{args.q_max}",
        "layer_cap": args.layer_max,
        "x_range": f"0..{args.x_max}",
        "exact_checks": checks,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "minima": {
            name: item[1] if item else None
            for name, item in minima.items()
        },
        "warning": (
            "This is exact finite evidence for the three proposed "
            "all-parameter inequalities, not their proof."
        ),
    }
    Path(
        "path_isolate_polarization_grouping_stress_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
