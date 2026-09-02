#!/usr/bin/env python3
"""Exact scout for leaf-arm extension monotonicity on subdivided claws.

This is evidence only until the increment formulas are certified all-order.
"""

from __future__ import annotations

import json
from pathlib import Path

from scan_rank8_delta23_e1_subdivided_claws_n23_n28 import evaluator
from scan_rank8_delta3_n28_e1_subdivided_claws import claw_poly, deletion_poly


RANKS = (0, 1, 2, 3)


def arm_partitions(order: int):
    total = order - 1
    for a in range(1, total + 1):
        for b in range(a, total + 1):
            c = total - a - b
            if c >= b:
                yield (a, b, c)


def rooted_profiles(arms: tuple[int, int, int]):
    yield (None, None)
    for arm, length in enumerate(arms):
        for distance in range(1, length + 1):
            yield (arm, distance)


def delta_values(order: int, arms: tuple[int, int, int], evaluators, root):
    core = claw_poly(arms)
    deleted = deletion_poly(arms, *root)
    values = (*core[3:9], deleted[6], deleted[7])
    return {rank: evaluators[rank](values) for rank in RANKS}


def main() -> None:
    base_evaluators = {rank: evaluator(rank, 23)[0] for rank in RANKS}
    base_minima = {rank: None for rank in RANKS}
    base_witnesses = {rank: None for rank in RANKS}
    base_roots = 0
    for arms in arm_partitions(23):
        for root in rooted_profiles(arms):
            values = delta_values(23, arms, base_evaluators, root)
            base_roots += 1
            for rank in RANKS:
                if base_minima[rank] is None or values[rank] < base_minima[rank]:
                    base_minima[rank] = values[rank]
                    base_witnesses[rank] = {
                        "arms": arms,
                        "root": root,
                        f"Delta{rank}": values[rank],
                    }
    assert all(base_minima[rank] > 0 for rank in RANKS), (
        base_minima,
        base_witnesses,
    )
    print("BASE_ORDER_PASS", base_roots, base_minima, flush=True)

    rows = []
    global_minimum = {rank: None for rank in RANKS}
    global_witness = {rank: None for rank in RANKS}
    for order in range(23, 36):
        old_evaluators = {rank: evaluator(rank, order)[0] for rank in RANKS}
        new_evaluators = {rank: evaluator(rank, order + 1)[0] for rank in RANKS}
        comparisons = 0
        inserted_roots = 0
        minima = {rank: None for rank in RANKS}
        witnesses = {rank: None for rank in RANKS}
        inserted_minima = {rank: None for rank in RANKS}
        for arms in arm_partitions(order):
            old_cache = {
                root: delta_values(order, arms, old_evaluators, root)
                for root in rooted_profiles(arms)
            }
            for extended_arm in range(3):
                extended = list(arms)
                extended[extended_arm] += 1
                extended = tuple(extended)
                for root, old_values in old_cache.items():
                    new_values = delta_values(
                        order + 1, extended, new_evaluators, root
                    )
                    comparisons += 1
                    for rank in RANKS:
                        increment = new_values[rank] - old_values[rank]
                        if minima[rank] is None or increment < minima[rank]:
                            minima[rank] = increment
                            witnesses[rank] = {
                                "arms": arms,
                                "extended_arm": extended_arm,
                                "root": root,
                                "old": old_values[rank],
                                "new": new_values[rank],
                                "increment": increment,
                            }
                        if (
                            global_minimum[rank] is None
                            or increment < global_minimum[rank]
                        ):
                            global_minimum[rank] = increment
                            global_witness[rank] = {
                                "order": order,
                                **witnesses[rank],
                            }
                new_root = (extended_arm, extended[extended_arm])
                new_values = delta_values(
                    order + 1, extended, new_evaluators, new_root
                )
                inserted_roots += 1
                for rank in RANKS:
                    value = new_values[rank]
                    if (
                        inserted_minima[rank] is None
                        or value < inserted_minima[rank]
                    ):
                        inserted_minima[rank] = value
        assert all(minima[rank] > 0 for rank in RANKS), (order, minima, witnesses)
        assert all(inserted_minima[rank] > 0 for rank in RANKS), (
            order,
            inserted_minima,
        )
        row = {
            "source_order": order,
            "old_root_comparisons": comparisons,
            "inserted_roots": inserted_roots,
            "minimum_increments": {str(k): v for k, v in minima.items()},
            "minimum_inserted_root_values": {
                str(k): v for k, v in inserted_minima.items()
            },
            "minimum_witnesses": {str(k): v for k, v in witnesses.items()},
        }
        rows.append(row)
        print("ORDER_PASS", order, comparisons, minima, flush=True)

    payload = {
        "status": "PASS_EXACT_SCOUT_RANK8_DELTA013_E1_LEAF_EXTENSION_ORDERS_23_35",
        "scope": "all subdivided claws at source orders 23 through 35, every arm extension and every old/new root",
        "warning": "Finite evidence only; not an all-order extension theorem.",
        "base_order_23": {
            "rooted_cases": base_roots,
            "minimum_values": {str(k): v for k, v in base_minima.items()},
            "minimum_witnesses": {str(k): v for k, v in base_witnesses.items()},
        },
        "orders": rows,
        "global_minimum_increments": {
            str(k): v for k, v in global_minimum.items()
        },
        "global_witnesses": {str(k): v for k, v in global_witness.items()},
    }
    output = Path(__file__).with_name(
        "rank8_delta013_e1_leaf_extension_scout_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])


if __name__ == "__main__":
    main()
