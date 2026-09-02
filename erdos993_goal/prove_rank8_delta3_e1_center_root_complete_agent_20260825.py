#!/usr/bin/env python3
"""Exact all-order Delta3 e=1 center-root arm-extension producer."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from pathlib import Path

import numpy as np

from probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825 import (
    claw_poly,
    evaluate,
    path_poly,
    poly_product,
    transform_axis,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_center_root_complete_exact_agent_20260825.json"
DEGREE = 26
WIDTH = DEGREE + 1
EXTENSIONS = ("short", "middle", "long")
COORDINATES = ("base", "middle_gap", "long_gap")
WEIGHTS = (3, 2, 1)
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "682830D92266857D64440BA3591C275D2CF6D47E6534F853F3BF2282451BA2C5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def center_deleted(arms: tuple[int, int, int]) -> tuple[int, ...]:
    return poly_product(tuple(path_poly(length) for length in arms))


def increment(
    extension: str, base: int, middle_gap: int, long_gap: int
) -> int:
    old_arms = (
        base + 1,
        base + middle_gap + 1,
        base + middle_gap + long_gap + 1,
    )
    old_value = evaluate(claw_poly(old_arms), center_deleted(old_arms))
    new_arms = list(old_arms)
    new_arms[{"short": 0, "middle": 1, "long": 2}[extension]] += 1
    new_tuple = tuple(new_arms)
    new_value = evaluate(claw_poly(new_tuple), center_deleted(new_tuple))
    return new_value - old_value


def branch_cells() -> list[tuple[tuple[int, int, int], tuple[str, ...]]]:
    cells = [((6, 0, 0), COORDINATES)]
    for base in range(6):
        middle_lower = 6 - base
        cells.append(((base, middle_lower, 0), ("middle_gap", "long_gap")))
        for middle_gap in range(middle_lower):
            long_lower = 6 - base - middle_gap
            cells.append(((base, middle_gap, long_lower), ("long_gap",)))
            for long_gap in range(long_lower):
                cells.append(((base, middle_gap, long_gap), ()))
    assert len(cells) == 84 and len(set(cells)) == 84
    return cells


def label(shifts: tuple[int, int, int], axes: tuple[str, ...]) -> str:
    active = set(axes)
    return ", ".join(
        f"{coordinate}>={shifts[index]}"
        if coordinate in active
        else f"{coordinate}={shifts[index]}"
        for index, coordinate in enumerate(COORDINATES)
    )


def routed_regions() -> list[dict[str, object]]:
    regions: list[tuple[tuple[int, int, int], tuple[str, ...]]] = []

    def route(
        shifts: tuple[int, int, int], axes: tuple[str, ...], deficit: int
    ) -> None:
        if deficit <= 0:
            regions.append((shifts, axes))
            return
        if not axes:
            return
        coordinate = axes[0]
        position = COORDINATES.index(coordinate)
        weight = WEIGHTS[position]
        sufficient = (deficit + weight - 1) // weight
        shifted = list(shifts)
        shifted[position] += sufficient
        regions.append((tuple(shifted), axes))
        for exact in range(sufficient):
            fixed = list(shifts)
            fixed[position] += exact
            route(tuple(fixed), axes[1:], deficit - weight * exact)

    for shifts, axes in branch_cells():
        minimum = sum(weight * value for weight, value in zip(WEIGHTS, shifts))
        route(shifts, axes, 19 - minimum)
    assert len(regions) == len(set(regions))
    return [
        {"shifts": shifts, "axes": axes, "label": label(shifts, axes)}
        for shifts, axes in regions
    ]


def contains(row: dict[str, object], point: tuple[int, int, int]) -> bool:
    active = set(row["axes"])
    for position, coordinate in enumerate(COORDINATES):
        if coordinate in active:
            if point[position] < row["shifts"][position]:
                return False
        elif point[position] != row["shifts"][position]:
            return False
    return True


def certify(extension: str, region: dict[str, object]) -> dict[str, object]:
    shifts = tuple(region["shifts"])
    axes = tuple(region["axes"])
    values = np.empty((WIDTH,) * len(axes), dtype=object)
    minimum_sampled = None
    for index in itertools.product(range(WIDTH), repeat=len(axes)):
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        value = increment(extension, *parameters)
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
    regions = routed_regions()
    checked = 0
    for point in itertools.product(range(21), repeat=3):
        expected = 3 * point[0] + 2 * point[1] + point[2] >= 19
        multiplicity = sum(contains(row, point) for row in regions)
        assert multiplicity == int(expected), (point, multiplicity)
        checked += 1

    orbits = []
    for extension in EXTENSIONS:
        rows = [certify(extension, region) for region in regions]
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
        print("CENTER_ROOT", extension, totals, flush=True)

    all_totals = [orbit["totals"] for orbit in orbits]
    proving = all(
        totals["negative"] == 0
        and int(totals["minimum_sampled_increment"]) > 0
        and int(totals["minimum_origin"]) > 0
        for totals in all_totals
    )
    payload = {
        "schema": "rank8-delta3-e1-center-root-complete-agent-v1",
        "status": (
            "PASS_EXACT_DELTA3_E1_CENTER_ROOT_ALL_ORDER_ALL_EXTENSIONS"
            if proving
            else "EXACT_CENTER_ROOT_HAS_NEWTON_OBSTRUCTIONS"
        ),
        "theorem": (
            "For every e=1 subdivided claw of source order at least 23, rooted "
            "at its center, extending any arm by one leaf strictly increases "
            "the Delta3 rank-eight terminal-residual coefficient."
        ),
        "rank": 3,
        "root": "claw center",
        "source_order_lower": 23,
        "ordered_source_arms": [
            "base+1",
            "base+middle_gap+1",
            "base+middle_gap+long_gap+1",
        ],
        "source_order_condition": "3*base+2*middle_gap+long_gap>=19",
        "extensions": list(EXTENSIONS),
        "degree_bound_each_active_axis": DEGREE,
        "branch_stable_partition": (
            "base>=6; or fixed base=0..5 with middle_gap>=6-base; or "
            "fixed smaller middle_gap with long_gap>=6-base-middle_gap; "
            "all smaller coordinates fixed"
        ),
        "order_cone_routing": (
            "generic recursive shifted-ray plus fixed-prefix split with weights "
            "base=3,middle_gap=2,long_gap=1"
        ),
        "orbits": orbits,
        "coverage_totals": {
            "extension_orbits": 3,
            "regions": sum(totals["regions"] for totals in all_totals),
            "newton_coefficients": sum(
                totals["coefficients"] for totals in all_totals
            ),
            "negative_coefficients": sum(
                totals["negative"] for totals in all_totals
            ),
            "all_origins_positive": all(
                int(totals["minimum_origin"]) > 0 for totals in all_totals
            ),
            "all_sampled_increments_positive": all(
                int(totals["minimum_sampled_increment"]) > 0
                for totals in all_totals
            ),
            "finite_coverage_points_checked": checked,
        },
        "dependency_sha256": actual_hashes,
        "proof_boundary": (
            "This covers only Delta3 e=1 subdivided-claw strict arm-extension "
            "increments at the old center root.  It does not cover inserted-new-"
            "leaf roots, arbitrary trees, full Q8/PGC, forest unimodality, or "
            "Erdos Problem 993."
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
