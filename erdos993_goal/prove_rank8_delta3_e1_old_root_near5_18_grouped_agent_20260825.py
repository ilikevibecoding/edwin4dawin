#!/usr/bin/env python3
"""Grouped exact Delta3 old-root producer for the finite band near=5..18."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from pathlib import Path

import numpy as np

from probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825 import (
    increment,
    transform_axis,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_old_root_near5_18_grouped_exact_agent_20260825.json"
DEGREE = 26
WIDTH = DEGREE + 1
NEARS = tuple(range(5, 19))
EXTENSIONS = ("root", "short", "long")
COORDINATES = ("tail", "short", "difference")
WEIGHTS = {"tail": 1, "short": 2, "difference": 1}
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


def base_regions() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    tail_categories = [
        ((6, 0, 0), ("tail",)),
        *[((tail, 0, 0), ()) for tail in range(6)],
    ]
    other_categories = [
        ((0, 6, 0), ("short", "difference")),
    ]
    for short in range(6):
        lower = 6 - short
        other_categories.append(((0, short, lower), ("difference",)))
        for difference in range(lower):
            other_categories.append(((0, short, difference), ()))
    assert len(tail_categories) == 7 and len(other_categories) == 28

    for tail_shift, tail_axes in tail_categories:
        for other_shift, other_axes in other_categories:
            shifts = (
                tail_shift[0],
                other_shift[1],
                other_shift[2],
            )
            axes = tuple(
                coordinate
                for coordinate in COORDINATES
                if coordinate in tail_axes or coordinate in other_axes
            )
            rows.append({"shifts": shifts, "axes": axes})
    assert len(rows) == 196
    assert len({(row["shifts"], row["axes"]) for row in rows}) == 196
    return rows


def region_label(shifts: tuple[int, int, int], axes: tuple[str, ...]) -> str:
    active = set(axes)
    return ", ".join(
        f"{coordinate}>={shifts[index]}"
        if coordinate in active
        else f"{coordinate}={shifts[index]}"
        for index, coordinate in enumerate(COORDINATES)
    )


def routed_regions(near: int) -> list[dict[str, object]]:
    threshold = 19 - near
    assert 1 <= threshold <= 14
    routed: list[dict[str, object]] = []

    def finish(shifts: tuple[int, int, int], axes: tuple[str, ...]) -> None:
        routed.append(
            {
                "label": region_label(shifts, axes),
                "shifts": shifts,
                "axes": axes,
            }
        )

    def intersect(
        shifts: tuple[int, int, int],
        axes: tuple[str, ...],
        deficit: int,
    ) -> None:
        if deficit <= 0:
            finish(shifts, axes)
            return
        if not axes:
            return
        coordinate = axes[0]
        coordinate_index = COORDINATES.index(coordinate)
        weight = WEIGHTS[coordinate]
        lower = (deficit + weight - 1) // weight

        high_shifts = list(shifts)
        high_shifts[coordinate_index] += lower
        finish(tuple(high_shifts), axes)

        remaining_axes = axes[1:]
        for fixed_increment in range(lower):
            fixed_shifts = list(shifts)
            fixed_shifts[coordinate_index] += fixed_increment
            intersect(
                tuple(fixed_shifts),
                remaining_axes,
                deficit - weight * fixed_increment,
            )

    for base in base_regions():
        shifts = tuple(base["shifts"])
        axes = tuple(base["axes"])
        minimum_weight = sum(
            WEIGHTS[coordinate] * shifts[index]
            for index, coordinate in enumerate(COORDINATES)
        )
        intersect(shifts, axes, threshold - minimum_weight)

    keys = {(row["shifts"], row["axes"]) for row in routed}
    assert len(keys) == len(routed)
    for row in routed:
        shifts = row["shifts"]
        assert shifts[0] + 2 * shifts[1] + shifts[2] >= threshold
    return routed


def contains(row: dict[str, object], point: tuple[int, int, int]) -> bool:
    active = set(row["axes"])
    for index, coordinate in enumerate(COORDINATES):
        if coordinate in active:
            if point[index] < row["shifts"][index]:
                return False
        elif point[index] != row["shifts"][index]:
            return False
    return True


def finite_coverage_check(near: int, rows: list[dict[str, object]]) -> int:
    # A redundant exact bounded ledger check.  The recursive split is the
    # symbolic proof; this cube catches implementation errors at every finite
    # boundary because all routing cutoffs are at most 14.
    threshold = 19 - near
    checked = 0
    for point in itertools.product(range(21), repeat=3):
        expected = point[0] + 2 * point[1] + point[2] >= threshold
        multiplicity = sum(contains(row, point) for row in rows)
        assert multiplicity == int(expected), (near, point, multiplicity)
        checked += 1
    return checked


def certify_region(
    near: int, extension: str, region: dict[str, object]
) -> dict[str, object]:
    axes = tuple(region["axes"])
    shifts = tuple(region["shifts"])
    shape = (WIDTH,) * len(axes)
    values = np.empty(shape, dtype=object)
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
        checked = finite_coverage_check(near, regions)
        orbit_rows = []
        for extension in EXTENSIONS:
            rows = [certify_region(near, extension, region) for region in regions]
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
            orbit_rows.append({"extension": extension, "totals": totals, "rows": rows})
            print("GROUPED_FINITE_BAND", near, extension, totals, flush=True)
        slices.append(
            {
                "near": near,
                "source_order_condition": (
                    f"tail+2*short+difference>={19 - near}"
                ),
                "finite_coverage_points_checked": checked,
                "partition_regions": len(regions),
                "orbits": orbit_rows,
            }
        )

    all_totals = [
        orbit["totals"]
        for section in slices
        for orbit in section["orbits"]
    ]
    proving = all(
        totals["negative"] == 0
        and int(totals["minimum_sampled_increment"]) > 0
        and int(totals["minimum_origin"]) > 0
        for totals in all_totals
    )
    payload = {
        "schema": "rank8-delta3-e1-old-root-near5-18-grouped-agent-v1",
        "status": (
            "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR5_18_ALL_EXTENSIONS"
            if proving
            else "EXACT_GROUPED_FINITE_BAND_HAS_NEWTON_OBSTRUCTIONS"
        ),
        "theorem": (
            "For every source order at least 23, every old-root distance "
            "near=5..18 on an e=1 subdivided claw, and every one-arm extension, "
            "the Delta3 rank-eight terminal-residual coefficient increases "
            "strictly."
        ),
        "rank": 3,
        "near_values": list(NEARS),
        "source_order_lower": 23,
        "extensions": list(EXTENSIONS),
        "degree_bound_each_active_axis": DEGREE,
        "branch_stable_base_partition": {
            "tail": "tail>=6 or tail=0..5",
            "short_difference": (
                "short>=6,difference>=0; or short=s in 0..5 with "
                "difference>=6-s or difference=0..5-s"
            ),
            "base_regions": 196,
        },
        "order_cone_routing": (
            "For threshold 19-near, recursively split the first active "
            "coordinate into its sufficient shifted ray and every smaller fixed "
            "prefix, using weights tail=1, short=2, difference=1."
        ),
        "path_transfer": "generic branch identity inherited only as arithmetic machinery",
        "degree_bound_reason": (
            "Active path-count branches are polynomial; the maximum exact "
            "rank-weighted monomial degree in the Delta3 residual is 26."
        ),
        "slices": slices,
        "coverage_totals": {
            "near_values": len(NEARS),
            "extension_orbits": len(NEARS) * len(EXTENSIONS),
            "regions": sum(totals["regions"] for totals in all_totals),
            "newton_coefficients": sum(
                totals["coefficients"] for totals in all_totals
            ),
            "negative_coefficients": sum(totals["negative"] for totals in all_totals),
            "all_origins_positive": all(
                int(totals["minimum_origin"]) > 0 for totals in all_totals
            ),
            "all_sampled_increments_positive": all(
                int(totals["minimum_sampled_increment"]) > 0
                for totals in all_totals
            ),
            "finite_coverage_points_checked": sum(
                section["finite_coverage_points_checked"] for section in slices
            ),
        },
        "dependency_sha256": actual_hashes,
        "proof_boundary": (
            "This grouped certificate covers only Delta3 e=1 subdivided-claw "
            "old-root arm-extension increments at near=5..18.  It imports no "
            "near=0..4 or near>=19 positivity conclusion and does not cover other "
            "root families, arbitrary trees, inserted-new-leaf gates, Q8/PGC, "
            "forest unimodality, or Erdos Problem 993."
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
