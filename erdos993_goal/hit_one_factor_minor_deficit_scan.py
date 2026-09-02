#!/usr/bin/env python3
"""Locate every failure of one-factor minor domination T >= E in HIT states.

The full-minor induction would be immediate if every planted state obeyed

    M_T(m,n) >= M_E(m,n).

That statement is false, but preliminary tests indicate that its failures
are sparse and confined to the top boundary.  This exact census records the
failure coordinates by child count and by distance from deg(E), so that a
two-or-more-factor cancellation lemma can target the real obstruction.
"""

from __future__ import annotations

import argparse
import json
import time
from collections import Counter
from pathlib import Path

from hit_curvature_reserve_stress import (
    coeff,
    core_generator,
    make_hit,
    planted_state,
    tree_certificate,
)


def minor(poly: list[int], m: int, n: int) -> int:
    return coeff(poly, m) * coeff(poly, n) - coeff(
        poly, m + 1
    ) * coeff(poly, n - 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-core", type=int, default=14)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    trees = 0
    states = 0
    checks = 0
    failures = 0
    minimum = None
    by_children: Counter[int] = Counter()
    failures_by_children: Counter[int] = Counter()
    failure_types: Counter[tuple[int, int, int, int, int]] = Counter()
    first_examples: dict[tuple[int, int, int, int, int], dict] = {}
    per_core_order = []

    for core_order in range(1, args.max_core + 1):
        order_trees = 0
        order_states = 0
        order_checks = 0
        order_failures = 0
        for core_index, core in enumerate(core_generator(core_order)):
            graph, leaves = make_hit(core)
            trees += 1
            order_trees += 1
            memo = {}
            records = []
            for vertex in graph:
                for parent in graph[vertex]:
                    records.append(
                        (
                            vertex,
                            parent,
                            planted_state(graph, vertex, parent, memo),
                        )
                    )
            for root in range(core_order):
                records.append(
                    (root, None, planted_state(graph, root, None, memo))
                )

            for vertex, parent, state in records:
                states += 1
                order_states += 1
                by_children[state.children] += 1
                degree_e = len(state.e) - 1
                degree_t = len(state.t) - 1
                degree_shift_j = len(state.j)
                degree_gap = degree_e - degree_shift_j
                for m in range(max(degree_e, degree_t) + 1):
                    for n in range(m + 1):
                        checks += 1
                        order_checks += 1
                        reserve = minor(state.t, m, n) - minor(
                            state.e, m, n
                        )
                        if minimum is None or reserve < minimum:
                            minimum = reserve
                        if reserve >= 0:
                            continue
                        failures += 1
                        order_failures += 1
                        failures_by_children[state.children] += 1
                        failure_type = (
                            state.children,
                            degree_gap,
                            m - n,
                            degree_e - m,
                            degree_e - n,
                        )
                        failure_types[failure_type] += 1
                        if failure_type not in first_examples:
                            first_examples[failure_type] = {
                                "core_order": core_order,
                                "core_index": core_index,
                                "leaf_counts": leaves,
                                "vertex": vertex,
                                "parent": parent,
                                "m": m,
                                "n": n,
                                "reserve": reserve,
                                "E": state.e,
                                "J": state.j,
                                "T": state.t,
                                "tree": tree_certificate(graph),
                            }

        per_core_order.append(
            {
                "core_order": core_order,
                "trees": order_trees,
                "states": order_states,
                "checks": order_checks,
                "failures": order_failures,
            }
        )
        print(
            f"h={core_order} trees={order_trees:,} "
            f"states={order_states:,} checks={order_checks:,} "
            f"failures={order_failures:,}",
            flush=True,
        )

    types = []
    for failure_type, count in sorted(failure_types.items()):
        types.append(
            {
                "children": failure_type[0],
                "degree_E_minus_degree_xJ": failure_type[1],
                "m_minus_n": failure_type[2],
                "degree_E_minus_m": failure_type[3],
                "degree_E_minus_n": failure_type[4],
                "count": count,
                "first_example": first_examples[failure_type],
            }
        )
    report = {
        "status": "EXACT_CENSUS_NOT_PROOF",
        "claim_falsified": (
            "M_T(m,n) >= M_E(m,n) for every planted HIT state"
        ),
        "parameters": {
            "max_core": args.max_core,
            "output": str(args.output),
        },
        "exact_arithmetic": True,
        "elapsed_seconds": time.time() - started,
        "summary": {
            "trees": trees,
            "states": states,
            "checks": checks,
            "failures": failures,
            "minimum_reserve": minimum,
            "states_by_children": {
                str(key): value for key, value in sorted(by_children.items())
            },
            "failures_by_children": {
                str(key): value
                for key, value in sorted(failures_by_children.items())
            },
        },
        "failure_types": types,
        "per_core_order": per_core_order,
    }
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "checks": checks,
                "failures": failures,
                "failure_type_count": len(types),
                "failures_by_children": report["summary"][
                    "failures_by_children"
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
