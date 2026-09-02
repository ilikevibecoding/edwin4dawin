#!/usr/bin/env python3
"""Exact collision census for capped five-cubic-path half messages.

This is a diagnostic for possible manifest reuse.  It reproduces the
rank-eight ``far_parts`` message from the CUDA formula using Python integers
and groups all 12,544 canonical five-coordinate path-half states by the full
pair of parent-free/parent-blocked coefficient vectors.  No sign or orbit
closure claim is made.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_half_message_reuse_probe_"
    "agent_20260825.json"
)
WIDTH = 9


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def path(order: int) -> tuple[int, ...]:
    if order == -1:
        return (1,) + (0,) * (WIDTH - 1)
    if order <= -2:
        return (0,) * WIDTH
    return tuple(
        math.comb(order - rank + 1, rank)
        if order - rank + 1 >= rank
        else 0
        for rank in range(WIDTH)
    )


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(
        sum(left[index] * right[rank - index] for index in range(rank + 1))
        for rank in range(WIDTH)
    )


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(a + b for a, b in zip(left, right))


def shift(vector: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + vector[:-1]


def cross(
    absent: tuple[int, ...], present: tuple[int, ...], length: int
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    free = add(
        multiply(path(length - 1), absent),
        multiply(path(length - 2), present),
    )
    blocked = add(
        multiply(path(length - 2), absent),
        multiply(path(length - 3), present),
    )
    return free, blocked


def far_parts(
    center_middle: int,
    middle_pendant: int,
    middle_outer: int,
    low: int,
    high: int,
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    outer_absent = multiply(path(low), path(high))
    outer_present = shift(multiply(path(low - 1), path(high - 1)))
    outer_free, outer_blocked = cross(
        outer_absent, outer_present, middle_outer
    )
    middle_absent = multiply(path(middle_pendant), outer_free)
    middle_present = shift(multiply(path(middle_pendant - 1), outer_blocked))
    return cross(middle_absent, middle_present, center_middle)


def main() -> None:
    signatures: dict[tuple[int, ...], list[tuple[int, ...]]] = {}
    ray_signatures: dict[tuple[int, ...], list[tuple[int, ...]]] = {}
    all_short_signatures: dict[tuple[int, ...], list[tuple[int, ...]]] = {}
    long_static_signatures: dict[tuple[int, ...], list[tuple[int, ...]]] = {}
    total = 0
    ray_states = 0
    for low in range(1, 8):
        for high in range(low, 8):
            for middle_outer in range(1, 9):
                for middle_pendant in range(1, 8):
                    for center_middle in range(1, 9):
                        state = (
                            center_middle,
                            middle_pendant,
                            middle_outer,
                            low,
                            high,
                        )
                        free, blocked = far_parts(*state)
                        signature = (*free, *blocked)
                        signatures.setdefault(signature, []).append(state)
                        maxima = (8, 7, 8, 7, 7)
                        first_long = next(
                            (
                                index
                                for index, (value, maximum) in enumerate(
                                    zip(state, maxima)
                                )
                                if value == maximum
                            ),
                            None,
                        )
                        if first_long is not None:
                            long_static_signatures.setdefault(signature, []).append(state)
                            curve = []
                            for offset in range(WIDTH):
                                shifted_state = list(state)
                                shifted_state[first_long] += offset
                                shifted_free, shifted_blocked = far_parts(
                                    *shifted_state
                                )
                                curve.extend((*shifted_free, *shifted_blocked))
                            ray_signatures.setdefault(tuple(curve), []).append(state)
                            ray_states += 1
                        else:
                            all_short_signatures.setdefault(signature, []).append(state)
                        total += 1
    assert total == 12_544
    for classes in (
        signatures,
        all_short_signatures,
        long_static_signatures,
        ray_signatures,
    ):
        assert all(
            len({sum(state) for state in states}) == 1
            for states in classes.values()
        )
    sizes = Counter(len(states) for states in signatures.values())
    collisions = [states for states in signatures.values() if len(states) > 1]
    ray_sizes = Counter(len(states) for states in ray_signatures.values())
    ray_collisions = [
        states for states in ray_signatures.values() if len(states) > 1
    ]
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-half-message-reuse-"
            "probe-agent-v1"
        ),
        "status": "PROBE_ONLY",
        "canonical_half_states": total,
        "distinct_full_rank8_messages": len(signatures),
        "multiplicity_histogram": {
            str(size): count for size, count in sorted(sizes.items())
        },
        "collision_classes": len(collisions),
        "states_in_collision_classes": sum(map(len, collisions)),
        "largest_collision_class": max(map(len, collisions), default=1),
        "first_collision_classes": collisions[:16],
        "states_with_at_least_one_long_coordinate": ray_states,
        "all_short_half_states": total - ray_states,
        "distinct_all_short_static_messages": len(all_short_signatures),
        "distinct_long_static_messages": len(long_static_signatures),
        "distinct_rank8_total_offset_message_curves": len(ray_signatures),
        "ray_curve_multiplicity_histogram": {
            str(size): count for size, count in sorted(ray_sizes.items())
        },
        "ray_curve_collision_classes": len(ray_collisions),
        "states_in_ray_curve_collision_classes": sum(map(len, ray_collisions)),
        "largest_ray_curve_collision_class": max(
            map(len, ray_collisions), default=1
        ),
        "first_ray_curve_collision_classes": ray_collisions[:16],
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Message collision census only; no residual sign, orbit symmetry, "
            "or proof credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
