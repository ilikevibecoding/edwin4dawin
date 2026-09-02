#!/usr/bin/env python3
"""Grouped Delta2 old-root producer for unsealed finite near=0,3..18."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from pathlib import Path

import numpy as np

from probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825 import (
    claw_poly,
    deleted_poly,
)
from prove_rank8_delta2_e1_center_root_complete_agent_20260825 import (
    evaluate,
    transform_axis,
)
from prove_rank8_delta3_e1_old_root_near5_18_grouped_agent_20260825 import (
    base_regions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_e1_old_root_remaining_finite_band_exact_agent_20260825.json"
RANK = 2
DEGREE = 27
WIDTH = DEGREE + 1
NEARS = (0, *range(3, 19))
EXTENSIONS = ("root", "short", "long")
COORDINATES = ("tail", "short", "difference")
WEIGHTS = (1, 2, 1)
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "682830D92266857D64440BA3591C275D2CF6D47E6534F853F3BF2282451BA2C5",
    "prove_rank8_delta2_e1_center_root_complete_agent_20260825.py":
        "96DC865B926CD16B6E88B7D94AE7E7414D24CF586637F18D8B3093B158144A8F",
    "prove_rank8_delta3_e1_old_root_near5_18_grouped_agent_20260825.py":
        "9B17B28E683714325B6D6D2907F9FA4069BB7CF36AD03BCC51B2A30BAB4B2488",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def increment(
    extension: str,
    near: int,
    tail: int,
    short: int,
    difference: int,
) -> int:
    old_arms = (near + tail + 1, short + 1, short + difference + 1)
    old_deleted = deleted_poly(near, tail, old_arms[1], old_arms[2])
    old_value = evaluate(claw_poly(old_arms), old_deleted)
    new_arms = list(old_arms)
    new_arms[{"root": 0, "short": 1, "long": 2}[extension]] += 1
    new_tuple = tuple(new_arms)
    new_tail = new_tuple[0] - near - 1
    new_deleted = deleted_poly(near, new_tail, new_tuple[1], new_tuple[2])
    return evaluate(claw_poly(new_tuple), new_deleted) - old_value


def region_label(shifts, axes):
    active = set(axes)
    return ", ".join(
        f"{coordinate}>={shifts[position]}"
        if coordinate in active
        else f"{coordinate}={shifts[position]}"
        for position, coordinate in enumerate(COORDINATES)
    )


def routed_regions(near: int) -> list[dict[str, object]]:
    threshold = 19 - near
    assert 1 <= threshold <= 19
    routed = []

    def route(shifts, axes, deficit):
        if deficit <= 0:
            routed.append((shifts, axes))
            return
        if not axes:
            return
        coordinate = axes[0]
        position = COORDINATES.index(coordinate)
        weight = WEIGHTS[position]
        sufficient = (deficit + weight - 1) // weight
        shifted = list(shifts)
        shifted[position] += sufficient
        routed.append((tuple(shifted), axes))
        for exact in range(sufficient):
            fixed = list(shifts)
            fixed[position] += exact
            route(tuple(fixed), axes[1:], deficit - weight * exact)

    for base in base_regions():
        shifts = tuple(base["shifts"])
        axes = tuple(base["axes"])
        minimum = sum(weight * value for weight, value in zip(WEIGHTS, shifts))
        route(shifts, axes, threshold - minimum)
    assert len(routed) == len(set(routed))
    return [
        {
            "shifts": shifts,
            "axes": axes,
            "label": region_label(shifts, axes),
        }
        for shifts, axes in routed
    ]


def contains(row, point):
    active = set(row["axes"])
    return all(
        point[position] >= row["shifts"][position]
        if coordinate in active
        else point[position] == row["shifts"][position]
        for position, coordinate in enumerate(COORDINATES)
    )


def certify(near, extension, region):
    shifts = tuple(region["shifts"])
    axes = tuple(region["axes"])
    values = np.empty((WIDTH,) * len(axes), dtype=object)
    minimum_sampled = None
    for index in itertools.product(range(WIDTH), repeat=len(axes)):
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        value = increment(extension, near, *parameters)
        values[index] = value
        minimum_sampled = value if minimum_sampled is None else min(minimum_sampled, value)
    for axis in range(len(axes)):
        transform_axis(values, axis)

    ordered = hashlib.sha256()
    negative = zero = 0
    minimum_coefficient = None
    first_negative = None
    for index in np.ndindex(values.shape):
        value = int(values[index])
        ordered.update(str(value).encode("ascii"))
        ordered.update(b"\n")
        if value < 0:
            negative += 1
            if first_negative is None:
                first_negative = {
                    "newton_orders": list(index),
                    "coefficient": str(value),
                }
        elif value == 0:
            zero += 1
        minimum_coefficient = (
            value if minimum_coefficient is None else min(minimum_coefficient, value)
        )
    count = values.size
    return {
        "near": near,
        "extension": extension,
        **region,
        "dimension": len(axes),
        "coefficients": count,
        "negative": negative,
        "zero": zero,
        "positive": count - negative - zero,
        "origin": str(int(values[(0,) * len(axes)])),
        "minimum_sampled_increment": str(minimum_sampled),
        "minimum_coefficient": str(minimum_coefficient),
        "first_negative": first_negative,
        "ordered_coefficients_sha256": ordered.hexdigest().upper(),
    }


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    slices = []
    for near in NEARS:
        regions = routed_regions(near)
        checked = 0
        threshold = 19 - near
        for point in itertools.product(range(21), repeat=3):
            member = point[0] + 2 * point[1] + point[2] >= threshold
            assert sum(contains(row, point) for row in regions) == int(member)
            checked += 1
        orbits = []
        for extension in EXTENSIONS:
            rows = [certify(near, extension, region) for region in regions]
            totals = {
                "regions": len(rows),
                "regions_by_dimension": {
                    str(dimension): sum(row["dimension"] == dimension for row in rows)
                    for dimension in (0, 1, 2, 3)
                },
                "coefficients": sum(row["coefficients"] for row in rows),
                "negative": sum(row["negative"] for row in rows),
                "zero": sum(row["zero"] for row in rows),
                "positive": sum(row["positive"] for row in rows),
                "minimum_sampled_increment": str(
                    min(int(row["minimum_sampled_increment"]) for row in rows)
                ),
                "minimum_origin": str(min(int(row["origin"]) for row in rows)),
                "minimum_coefficient": str(
                    min(int(row["minimum_coefficient"]) for row in rows)
                ),
            }
            orbits.append({"extension": extension, "totals": totals, "rows": rows})
            print("DELTA2_FINITE_ARM", near, extension, totals, flush=True)
        slices.append(
            {
                "near": near,
                "source_order_condition": (
                    f"tail+2*short+difference>={threshold}"
                ),
                "finite_coverage_points_checked": checked,
                "orbits": orbits,
            }
        )

    totals = [orbit["totals"] for section in slices for orbit in section["orbits"]]
    proving = all(
        row["negative"] == 0
        and int(row["minimum_sampled_increment"]) > 0
        and int(row["minimum_origin"]) > 0
        for row in totals
    )
    payload = {
        "schema": "rank8-delta2-e1-old-root-remaining-finite-band-agent-v1",
        "status": (
            "PASS_EXACT_DELTA2_E1_OLD_ROOT_REMAINING_FINITE_NEAR0_3_18"
            if proving
            else "EXACT_DELTA2_REMAINING_FINITE_HAS_NEWTON_OBSTRUCTIONS"
        ),
        "theorem": (
            "For source order at least 23 and every e=1 old arm root with "
            "near=0 or near=3..18, all three arm extensions strictly increase "
            "the Delta2 rank-eight terminal-residual coefficient."
        ),
        "rank": RANK,
        "near_values": list(NEARS),
        "excluded_already_sealed_near_values": [1, 2],
        "source_order_lower": 23,
        "extensions": list(EXTENSIONS),
        "degree_bound_each_active_axis": DEGREE,
        "branch_stable_partition": (
            "tail>=6 or fixed 0..5; short>=6,difference>=0, or fixed "
            "short=s<6 and difference>=6-s or fixed below"
        ),
        "slices": slices,
        "coverage_totals": {
            "near_values": len(NEARS),
            "extension_orbits": len(NEARS) * len(EXTENSIONS),
            "regions": sum(row["regions"] for row in totals),
            "newton_coefficients": sum(row["coefficients"] for row in totals),
            "negative_coefficients": sum(row["negative"] for row in totals),
            "all_origins_positive": all(
                int(row["minimum_origin"]) > 0 for row in totals
            ),
            "all_sampled_increments_positive": all(
                int(row["minimum_sampled_increment"]) > 0 for row in totals
            ),
            "finite_coverage_points_checked": sum(
                section["finite_coverage_points_checked"] for section in slices
            ),
        },
        "dependency_sha256": actual_hashes,
        "proof_boundary": (
            "This covers only the previously unsealed finite Delta2 e=1 arm-old-"
            "root strict-increment distances near=0,3..18.  Near=1,2 are not "
            "reproved here; near>=19, inserted-new-leaf roots, arbitrary trees, "
            "Q8/PGC, forest unimodality, and Erdos Problem 993 remain outside."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("COVERAGE", payload["coverage_totals"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
