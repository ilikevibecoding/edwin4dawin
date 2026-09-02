#!/usr/bin/env python3
"""Exact Delta2 routing profile for every arm-old-root distance near>=19.

This producer uses the closed binomial path formulas and the exact rank-two
terminal-residual evaluator.  A separate audit replays every coefficient with
literal adjacency lists and an independently derived include/exclude tree DP.
"""

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


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_e1_old_root_near19_uniform_tail_exact_agent_20260825.json"
RANK = 2
DEGREE = 27
WIDTH = DEGREE + 1
NEAR_SHIFT = 19
SMALL_CUTOFF = 6
EXTENSIONS = ("root", "short", "long")
COORDINATES = ("near", "tail", "short", "difference")
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "682830D92266857D64440BA3591C275D2CF6D47E6534F853F3BF2282451BA2C5",
    "prove_rank8_delta2_e1_center_root_complete_agent_20260825.py":
        "96DC865B926CD16B6E88B7D94AE7E7414D24CF586637F18D8B3093B158144A8F",
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


def regions() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []

    def add(label: str, shifts: tuple[int, int, int, int], axes: tuple[str, ...]) -> None:
        rows.append({"label": label, "shifts": shifts, "axes": axes})

    add(
        "tail>=6, short>=6, difference>=0",
        (NEAR_SHIFT, 6, 6, 0),
        COORDINATES,
    )
    for short in range(SMALL_CUTOFF):
        lower = SMALL_CUTOFF - short
        add(
            f"tail>=6, short={short}, difference>={lower}",
            (NEAR_SHIFT, 6, short, lower),
            ("near", "tail", "difference"),
        )
        for difference in range(lower):
            add(
                f"tail>=6, short={short}, difference={difference}",
                (NEAR_SHIFT, 6, short, difference),
                ("near", "tail"),
            )
    for tail in range(SMALL_CUTOFF):
        add(
            f"tail={tail}, short>=6, difference>=0",
            (NEAR_SHIFT, tail, 6, 0),
            ("near", "short", "difference"),
        )
        for short in range(SMALL_CUTOFF):
            lower = SMALL_CUTOFF - short
            add(
                f"tail={tail}, short={short}, difference>={lower}",
                (NEAR_SHIFT, tail, short, lower),
                ("near", "difference"),
            )
            for difference in range(lower):
                add(
                    f"tail={tail}, short={short}, difference={difference}",
                    (NEAR_SHIFT, tail, short, difference),
                    ("near",),
                )
    assert len(rows) == 196
    assert {
        dimension: sum(len(row["axes"]) == dimension for row in rows)
        for dimension in (1, 2, 3, 4)
    } == {1: 126, 2: 57, 3: 12, 4: 1}
    assert sum(WIDTH ** len(row["axes"]) for row in rows) == 926296
    return rows


def certify_region(extension: str, region: dict[str, object]) -> dict[str, object]:
    axes = tuple(region["axes"])
    shifts = tuple(region["shifts"])
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
                first_negative = {"newton_orders": list(index), "coefficient": str(value)}
        elif value == 0:
            zero += 1
        minimum_coefficient = value if minimum_coefficient is None else min(minimum_coefficient, value)
    count = values.size
    return {
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
    partition = regions()
    profiles = []
    for extension in EXTENSIONS:
        rows = []
        for index, region in enumerate(partition, start=1):
            rows.append(certify_region(extension, region))
            if index == 1 or index % 20 == 0 or index == len(partition):
                print(
                    "DELTA2_UNIFORM_TAIL_PROGRESS",
                    extension,
                    index,
                    "NEGATIVE_SO_FAR",
                    sum(item["negative"] for item in rows),
                    flush=True,
                )
        totals = {
            "regions": len(rows),
            "regions_by_dimension": {
                str(dimension): sum(row["dimension"] == dimension for row in rows)
                for dimension in (1, 2, 3, 4)
            },
            "coefficients": sum(row["coefficients"] for row in rows),
            "negative": sum(row["negative"] for row in rows),
            "zero": sum(row["zero"] for row in rows),
            "positive": sum(row["positive"] for row in rows),
            "minimum_sampled_increment": str(min(int(row["minimum_sampled_increment"]) for row in rows)),
            "minimum_origin": str(min(int(row["origin"]) for row in rows)),
            "minimum_coefficient": str(min(int(row["minimum_coefficient"]) for row in rows)),
        }
        profiles.append({"extension": extension, "totals": totals, "rows": rows})
        print("DELTA2_UNIFORM_TAIL_EXTENSION", extension, totals, flush=True)

    proving = all(
        profile["totals"]["negative"] == 0
        and int(profile["totals"]["minimum_sampled_increment"]) > 0
        and int(profile["totals"]["minimum_origin"]) > 0
        for profile in profiles
    )
    payload = {
        "schema": "rank8-delta2-e1-old-root-near19-uniform-tail-agent-v1",
        "status": (
            "PASS_EXACT_DELTA2_E1_OLD_ROOT_NEAR19_PLUS_ALL_EXTENSIONS"
            if proving
            else "EXACT_DELTA2_E1_OLD_ROOT_NEAR19_TAIL_HAS_NEWTON_OBSTRUCTIONS"
        ),
        "theorem": (
            "For every e=1 subdivided claw rooted on an arm with near>=19, "
            "extending any one of its three arms strictly increases the Delta2 "
            "rank-eight terminal-residual coefficient at the old root."
        ),
        "rank": RANK,
        "near_lower": NEAR_SHIFT,
        "source_order_lower": 23,
        "source_order_automatic": True,
        "extensions": list(EXTENSIONS),
        "degree_bound_each_active_axis": DEGREE,
        "partition": {
            "near": "near>=19 in every region",
            "tail": "tail>=6 or tail=0..5",
            "short_difference": (
                "short>=6,difference>=0; or short=s in 0..5 with "
                "difference>=6-s or difference=0..5-s"
            ),
            "disjoint_exhaustive": True,
            "regions_per_extension": 196,
            "regions_by_dimension": {"1": 126, "2": 57, "3": 12, "4": 1},
            "coefficients_per_extension": 926296,
        },
        "profiles": profiles,
        "coverage_totals": {
            "extension_orbits": 3,
            "regions": 588,
            "regions_by_dimension": {"1": 378, "2": 171, "3": 36, "4": 3},
            "newton_coefficients": sum(profile["totals"]["coefficients"] for profile in profiles),
            "negative_coefficients": sum(profile["totals"]["negative"] for profile in profiles),
            "zero_coefficients": sum(profile["totals"]["zero"] for profile in profiles),
            "positive_coefficients": sum(profile["totals"]["positive"] for profile in profiles),
            "all_origins_positive": all(int(profile["totals"]["minimum_origin"]) > 0 for profile in profiles),
            "all_sampled_increments_positive": all(int(profile["totals"]["minimum_sampled_increment"]) > 0 for profile in profiles),
        },
        "dependency_sha256": actual_hashes,
        "proof_boundary": (
            "This covers only Delta2 e=1 subdivided-claw arm-old-root strict "
            "increments for near>=19.  Finite near values, center roots, inserted-"
            "new-leaf roots, arbitrary trees, Q8/PGC, forest unimodality, and "
            "Erdos Problem 993 are outside this certificate."
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
