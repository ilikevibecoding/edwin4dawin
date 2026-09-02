#!/usr/bin/env python3
"""Random exact stress test of the primary HIT full-minor invariant.

Unlike the minimal-padding exhaustive census, this test adds independent
extra-leaf counts at every core vertex.  It samples planted orientations
instead of checking every orientation, allowing much larger and more varied
homeomorphically irreducible trees to be tested.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path

from hit_curvature_reserve_stress import (
    degree_two_broom,
    make_hit,
    planted_state,
    random_core,
    tree_certificate,
)
from hit_full_minor_reserve_stress import toeplitz_minor


def check_state(state) -> tuple[int, dict | None, dict | None]:
    checks = 0
    closest = None
    upper = max(len(state.t) - 1, len(state.j))
    for m in range(upper + 1):
        for n in range(m + 1):
            lhs = toeplitz_minor(state.t, m, n)
            rhs = toeplitz_minor(state.j, m - 1, n - 1)
            reserve = lhs - rhs
            checks += 1
            if reserve < 0:
                return checks, {
                    "m": m,
                    "n": n,
                    "reserve": reserve,
                    "T_minor": lhs,
                    "shifted_J_minor": rhs,
                    "E": state.e,
                    "J": state.j,
                    "T": state.t,
                }, closest
            if rhs > 0 and (
                closest is None
                or lhs * closest["denominator"]
                < closest["numerator"] * rhs
            ):
                closest = {
                    "m": m,
                    "n": n,
                    "numerator": lhs,
                    "denominator": rhs,
                    "reserve": reserve,
                }
    return checks, None, closest


def better(candidate: dict | None, incumbent: dict | None) -> bool:
    if candidate is None:
        return False
    if incumbent is None:
        return True
    return (
        candidate["numerator"] * incumbent["denominator"]
        < incumbent["numerator"] * candidate["denominator"]
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=10_000)
    parser.add_argument("--max-core", type=int, default=30)
    parser.add_argument("--max-extra-leaves", type=int, default=6)
    parser.add_argument("--states-per-tree", type=int, default=4)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    started = time.time()
    trees = 0
    states = 0
    checks = 0
    champion = None

    for trial in range(args.trials):
        core_order = rng.randint(1, args.max_core)
        core = random_core(rng, core_order)
        extras = [
            rng.randint(0, args.max_extra_leaves)
            for _ in range(core_order)
        ]
        graph, leaf_counts = make_hit(core, extras)
        memo = {}
        orientations = [
            (vertex, parent)
            for vertex in graph
            for parent in graph[vertex]
        ]
        orientations.extend(
            (root, None) for root in range(core_order)
        )
        rng.shuffle(orientations)
        sample = orientations[: args.states_per_tree]
        trees += 1

        for vertex, parent in sample:
            state = planted_state(graph, vertex, parent, memo)
            part_checks, failure, closest = check_state(state)
            states += 1
            checks += part_checks
            context = {
                "trial": trial,
                "core_order": core_order,
                "leaf_counts": leaf_counts,
                "vertex": vertex,
                "parent": parent,
                "tree": tree_certificate(graph),
            }
            if closest is not None:
                record = {
                    **closest,
                    "decimal": (
                        closest["numerator"] / closest["denominator"]
                    ),
                    "context": context,
                }
                if better(record, champion):
                    champion = record
            if failure is not None:
                witness = {**failure, "context": context}
                report = {
                    "status": "PRIMARY_INVARIANT_COUNTEREXAMPLE",
                    "exact_arithmetic": True,
                    "parameters": vars(args)
                    | {"output": str(args.output)},
                    "elapsed_seconds": time.time() - started,
                    "trees": trees,
                    "states": states,
                    "checks": checks,
                    "champion": champion,
                    "witness": witness,
                }
                args.output.write_text(
                    json.dumps(report, indent=2),
                    encoding="utf-8",
                )
                print(json.dumps(report, indent=2), flush=True)
                return 1

        if (trial + 1) % 250 == 0:
            checkpoint = {
                "status": "running",
                "exact_arithmetic": True,
                "parameters": vars(args)
                | {"output": str(args.output)},
                "elapsed_seconds": time.time() - started,
                "completed_trials": trial + 1,
                "trees": trees,
                "states": states,
                "checks": checks,
                "champion": champion,
            }
            args.output.write_text(
                json.dumps(checkpoint, indent=2),
                encoding="utf-8",
            )
            print(
                f"trials={trial + 1:,} states={states:,} "
                f"checks={checks:,}",
                flush=True,
            )

    # Mandatory negative control outside the HIT class.
    control_graph = degree_two_broom()
    control_memo = {}
    control_failure = None
    for root in control_graph:
        state = planted_state(control_graph, root, None, control_memo)
        _, failure, _ = check_state(state)
        if failure is not None:
            control_failure = {
                **failure,
                "root": root,
                "tree": tree_certificate(control_graph),
            }
            break
    if control_failure is None:
        raise AssertionError("degree-two negative control did not fail")

    report = {
        "status": "PASS_NOT_PROOF",
        "exact_arithmetic": True,
        "parameters": vars(args) | {"output": str(args.output)},
        "elapsed_seconds": time.time() - started,
        "trees": trees,
        "states": states,
        "checks": checks,
        "champion": champion,
        "degree_two_negative_control": control_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "trees": trees,
                "states": states,
                "checks": checks,
                "champion": champion,
                "control_reserve": control_failure["reserve"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
