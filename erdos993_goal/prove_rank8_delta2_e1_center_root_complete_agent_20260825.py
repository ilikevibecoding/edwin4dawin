#!/usr/bin/env python3
"""Exact all-order Delta2 e=1 center-root arm-extension producer."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from pathlib import Path

import numpy as np
import sympy as sp

from probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825 import (
    claw_poly,
    path_poly,
    poly_product,
)
from prove_rank8_delta3_e1_center_root_complete_agent_20260825 import (
    contains,
    routed_regions,
)
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_e1_center_root_complete_exact_agent_20260825.json"
RANK = 2
DEGREE = 27
WIDTH = DEGREE + 1
EXTENSIONS = ("short", "middle", "long")
COORDINATES = ("base", "middle_gap", "long_gap")
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "682830D92266857D64440BA3591C275D2CF6D47E6534F853F3BF2282451BA2C5",
    "prove_rank8_delta3_e1_center_root_complete_agent_20260825.py":
        "9E6F77D3C5683C2E435CE69F2A57CBA8A32BF2D7AEBDB12E5545197EFA0FBD46",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def delta2_terms() -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    raw = sp.Poly(
        newton_coefficients(residual())[RANK], *variables, domain=sp.QQ
    ).terms()
    assert len(raw) == 22
    terms = []
    for monomial, coefficient in raw:
        assert coefficient.q == 1
        factors = tuple(
            (index, exponent)
            for index, exponent in enumerate(monomial)
            if exponent
        )
        terms.append((int(coefficient), factors))
    weights = tuple(range(9)) + (6, 7)
    assert max(
        sum(exponent * weights[index] for index, exponent in factors)
        for _, factors in terms
    ) == DEGREE
    return tuple(terms)


TERMS = delta2_terms()


def evaluate(core: tuple[int, ...], deleted: tuple[int, ...]) -> int:
    values = (*core, deleted[6], deleted[7])
    answer = 0
    for coefficient, factors in TERMS:
        term = coefficient
        for index, exponent in factors:
            term *= values[index] ** exponent
        answer += term
    return answer


def center_deleted(arms: tuple[int, int, int]) -> tuple[int, ...]:
    return poly_product(tuple(path_poly(length) for length in arms))


def increment(extension: str, base: int, middle_gap: int, long_gap: int) -> int:
    old_arms = (
        base + 1,
        base + middle_gap + 1,
        base + middle_gap + long_gap + 1,
    )
    old_value = evaluate(claw_poly(old_arms), center_deleted(old_arms))
    new_arms = list(old_arms)
    new_arms[{"short": 0, "middle": 1, "long": 2}[extension]] += 1
    new_tuple = tuple(new_arms)
    return evaluate(claw_poly(new_tuple), center_deleted(new_tuple)) - old_value


def transform_axis(values: np.ndarray, axis: int) -> None:
    moved = np.moveaxis(values, axis, 0)
    width = moved.shape[0]
    for trailing in np.ndindex(moved.shape[1:]):
        work = [int(moved[(position,) + trailing]) for position in range(width)]
        for order in range(width):
            moved[(order,) + trailing] = work[0]
            for position in range(width - order - 1):
                work[position] = work[position + 1] - work[position]


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
        assert sum(contains(row, point) for row in regions) == int(expected)
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
        print("DELTA2_CENTER_ROOT", extension, totals, flush=True)

    all_totals = [orbit["totals"] for orbit in orbits]
    proving = all(
        totals["negative"] == 0
        and int(totals["minimum_sampled_increment"]) > 0
        and int(totals["minimum_origin"]) > 0
        for totals in all_totals
    )
    payload = {
        "schema": "rank8-delta2-e1-center-root-complete-agent-v1",
        "status": (
            "PASS_EXACT_DELTA2_E1_CENTER_ROOT_ALL_ORDER_ALL_EXTENSIONS"
            if proving
            else "EXACT_DELTA2_CENTER_ROOT_HAS_NEWTON_OBSTRUCTIONS"
        ),
        "theorem": (
            "For every e=1 subdivided claw of source order at least 23, rooted "
            "at its center, extending any arm by one leaf strictly increases "
            "the Delta2 rank-eight terminal-residual coefficient."
        ),
        "rank": RANK,
        "root": "claw center",
        "source_order_lower": 23,
        "source_order_condition": "3*base+2*middle_gap+long_gap>=19",
        "extensions": list(EXTENSIONS),
        "degree_bound_each_active_axis": DEGREE,
        "routing_dependency": (
            "Only the verified branch-stable center-root partition and weighted "
            "order-cone routing are reused; all Delta2 values and coefficients "
            "are freshly evaluated."
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
            "This covers only Delta2 e=1 subdivided-claw strict arm-extension "
            "increments at the old center root.  It is distinct from the older "
            "all-root Delta2 value theorem and does not cover inserted-new-leaf "
            "roots, arbitrary trees, Q8/PGC, forest unimodality, or Erdos "
            "Problem 993."
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
