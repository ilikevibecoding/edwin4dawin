#!/usr/bin/env python3
"""Digest-bearing exact producer for Delta2/3 e=1 inserted-new-leaf roots."""

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
)
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
LEGACY = HERE / "rank8_delta013_e1_new_leaf_all_order_exact_20260820.json"
OUTPUT = HERE / "rank8_delta23_e1_inserted_new_leaf_complete_exact_agent_20260825.json"
RANKS = (2, 3)
DEGREES = {2: 27, 3: 26}
EXTENDED_ARMS = (0, 1, 2)
COORDINATES = ("A", "B", "C")
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "682830D92266857D64440BA3591C275D2CF6D47E6534F853F3BF2282451BA2C5",
    "certify_rank8_delta013_e1_new_leaf_all_order.py":
        "9899FC2D687ADFE1DE8A60314563FE42AF24064D12E0F50870AC364E1E54903E",
    "rank8_delta013_e1_new_leaf_all_order_exact_20260820.json":
        "968F0DD84D0ABB95B9677FB1A33D6C4C6C39F60A8D10EBEBCE6D50F58B218960",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def rank_terms(rank: int) -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    raw = sp.Poly(newton_coefficients(residual())[rank], *variables, domain=sp.QQ).terms()
    assert len(raw) == {2: 22, 3: 26}[rank]
    terms = []
    for monomial, coefficient in raw:
        assert coefficient.q == 1
        terms.append(
            (
                int(coefficient),
                tuple(
                    (index, exponent)
                    for index, exponent in enumerate(monomial)
                    if exponent
                ),
            )
        )
    weights = tuple(range(9)) + (6, 7)
    assert max(
        sum(exponent * weights[index] for index, exponent in factors)
        for _, factors in terms
    ) == DEGREES[rank]
    return tuple(terms)


TERMS = {rank: rank_terms(rank) for rank in RANKS}


def evaluate(rank: int, core: tuple[int, ...], deleted: tuple[int, ...]) -> int:
    values = (*core, deleted[6], deleted[7])
    answer = 0
    for coefficient, factors in TERMS[rank]:
        term = coefficient
        for index, exponent in factors:
            term *= values[index] ** exponent
        answer += term
    return answer


def inserted_value(rank: int, extended_arm: int, A: int, B: int, C: int) -> int:
    old_arms = (A + 1, A + B + 1, A + B + C + 1)
    new_arms = list(old_arms)
    new_arms[extended_arm] += 1
    return evaluate(rank, claw_poly(tuple(new_arms)), claw_poly(old_arms))


def regions() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    rows.append(
        {
            "label": "A>=7",
            "shifts": [7, 0, 0],
            "axes": ["A", "B", "C"],
        }
    )
    for A in range(7):
        threshold = 19 - 3 * A
        bulk_B = (threshold + 1) // 2
        rows.append(
            {
                "label": f"A={A}, B>={bulk_B}",
                "shifts": [A, bulk_B, 0],
                "axes": ["B", "C"],
            }
        )
        for B in range(bulk_B):
            lower_C = threshold - 2 * B
            rows.append(
                {
                    "label": f"A={A}, B={B}, C>={lower_C}",
                    "shifts": [A, B, lower_C],
                    "axes": ["C"],
                }
            )
    assert len(rows) == 45
    assert {
        dimension: sum(len(row["axes"]) == dimension for row in rows)
        for dimension in (1, 2, 3)
    } == {1: 37, 2: 7, 3: 1}
    return rows


def region_key(row: dict[str, object]) -> tuple[object, ...]:
    return row["label"], tuple(row["shifts"]), tuple(row["axes"])


def contains(row: dict[str, object], point: tuple[int, int, int]) -> bool:
    active = set(row["axes"])
    return all(
        point[index] >= row["shifts"][index]
        if coordinate in active
        else point[index] == row["shifts"][index]
        for index, coordinate in enumerate(COORDINATES)
    )


def transform_axis(values: np.ndarray, axis: int) -> None:
    moved = np.moveaxis(values, axis, 0)
    width = moved.shape[0]
    for trailing in np.ndindex(moved.shape[1:]):
        work = [int(moved[(position,) + trailing]) for position in range(width)]
        for order in range(width):
            moved[(order,) + trailing] = work[0]
            for position in range(width - order - 1):
                work[position] = work[position + 1] - work[position]


def certify_region(
    rank: int, extended_arm: int, region: dict[str, object]
) -> dict[str, object]:
    degree = DEGREES[rank]
    width = degree + 1
    shifts = tuple(region["shifts"])
    axes = tuple(region["axes"])
    values = np.empty((width,) * len(axes), dtype=object)
    minimum_sampled = None
    for index in itertools.product(range(width), repeat=len(axes)):
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        value = inserted_value(rank, extended_arm, *parameters)
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
        "degree_bound_each_axis": degree,
        "coefficients": count,
        "negative": negative,
        "zero": zero,
        "positive": count - negative - zero,
        "origin": str(int(values[(0,) * len(axes)])),
        "minimum_sampled_value": str(minimum_sampled),
        "minimum_coefficient": str(minimum_coefficient),
        "first_negative": first_negative,
        "ordered_coefficients_sha256": ordered.hexdigest().upper(),
    }


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    partition = regions()
    finite_points = 0
    for point in itertools.product(range(21), repeat=3):
        member = 3 * point[0] + 2 * point[1] + point[2] >= 19
        multiplicity = sum(contains(row, point) for row in partition)
        assert multiplicity == int(member), (point, multiplicity)
        finite_points += 1

    cases = []
    for rank in RANKS:
        for extended_arm in EXTENDED_ARMS:
            rows = [certify_region(rank, extended_arm, region) for region in partition]
            totals = {
                "regions": len(rows),
                "regions_by_dimension": {
                    str(dimension): sum(row["dimension"] == dimension for row in rows)
                    for dimension in (1, 2, 3)
                },
                "coefficients": sum(row["coefficients"] for row in rows),
                "negative": sum(row["negative"] for row in rows),
                "zero": sum(row["zero"] for row in rows),
                "positive": sum(row["positive"] for row in rows),
                "minimum_sampled_value": str(
                    min(int(row["minimum_sampled_value"]) for row in rows)
                ),
                "minimum_origin": str(min(int(row["origin"]) for row in rows)),
                "minimum_coefficient": str(
                    min(int(row["minimum_coefficient"]) for row in rows)
                ),
            }
            cases.append(
                {
                    "rank": rank,
                    "extended_arm": extended_arm,
                    "totals": totals,
                    "rows": rows,
                }
            )
            print("DELTA23_INSERTED_NEW_LEAF", rank, extended_arm, totals, flush=True)

    legacy = json.loads(LEGACY.read_text(encoding="utf-8"))
    legacy_slices = {}
    for rank in RANKS:
        selected = [entry for entry in legacy["cases"] if entry["Delta_rank"] == rank]
        legacy_slices[str(rank)] = {
            "cases": len(selected),
            "regions": sum(len(entry["cells"]) for entry in selected),
            "coefficients": sum(
                cell["coefficients"] for entry in selected for cell in entry["cells"]
            ),
            "negative": sum(
                cell["negative"] for entry in selected for cell in entry["cells"]
            ),
            "zero": sum(cell["zero"] for entry in selected for cell in entry["cells"]),
            "positive": sum(
                cell["positive"] for entry in selected for cell in entry["cells"]
            ),
        }
    rank_summaries = {}
    for rank in RANKS:
        selected = [case["totals"] for case in cases if case["rank"] == rank]
        summary = {
            "extension_orbits": len(selected),
            "regions": sum(row["regions"] for row in selected),
            "coefficients": sum(row["coefficients"] for row in selected),
            "negative": sum(row["negative"] for row in selected),
            "zero": sum(row["zero"] for row in selected),
            "positive": sum(row["positive"] for row in selected),
            "all_origins_positive": all(int(row["minimum_origin"]) > 0 for row in selected),
            "all_sampled_values_positive": all(
                int(row["minimum_sampled_value"]) > 0 for row in selected
            ),
        }
        legacy_slice = legacy_slices[str(rank)]
        assert summary["extension_orbits"] == legacy_slice["cases"]
        for field in ("regions", "coefficients", "negative", "zero", "positive"):
            assert summary[field] == legacy_slice[field], (rank, field, summary, legacy_slice)
        assert summary["all_origins_positive"] is True
        assert summary["all_sampled_values_positive"] is True
        rank_summaries[str(rank)] = summary

    totals = [case["totals"] for case in cases]
    proving = all(
        row["negative"] == 0
        and int(row["minimum_origin"]) > 0
        and int(row["minimum_sampled_value"]) > 0
        for row in totals
    )
    payload = {
        "schema": "rank8-delta23-e1-inserted-new-leaf-complete-agent-v1",
        "status": (
            "PASS_EXACT_DELTA23_E1_INSERTED_NEW_LEAF_ALL_ORDER_ALL_EXTENSIONS"
            if proving
            else "EXACT_DELTA23_E1_INSERTED_NEW_LEAF_HAS_NEWTON_OBSTRUCTIONS"
        ),
        "theorem": (
            "For every e=1 subdivided claw of source order at least 23 and "
            "every choice of extended arm, the Delta2 and Delta3 rank-eight "
            "terminal-residual coefficients at the inserted new leaf are positive."
        ),
        "ranks": list(RANKS),
        "source_order_lower": 23,
        "extended_arms": list(EXTENDED_ARMS),
        "ordered_source_arms": ["A+1", "A+B+1", "A+B+C+1"],
        "source_order_condition": "3*A+2*B+C>=19",
        "degree_bounds": {str(rank): DEGREES[rank] for rank in RANKS},
        "partition": {
            "description": (
                "A>=7; or A=0..6 with B>=ceil((19-3A)/2); or fixed "
                "smaller B with C>=19-3A-2B"
            ),
            "disjoint_exhaustive": True,
            "regions_per_rank_extension": 45,
            "regions_by_dimension": {"1": 37, "2": 7, "3": 1},
            "finite_coverage_points_checked": finite_points,
        },
        "rank_summaries": rank_summaries,
        "coverage_totals": {
            "rank_extension_orbits": len(cases),
            "regions": sum(row["regions"] for row in totals),
            "newton_coefficients": sum(row["coefficients"] for row in totals),
            "negative_coefficients": sum(row["negative"] for row in totals),
            "zero_coefficients": sum(row["zero"] for row in totals),
            "positive_coefficients": sum(row["positive"] for row in totals),
            "all_origins_positive": all(int(row["minimum_origin"]) > 0 for row in totals),
            "all_sampled_values_positive": all(
                int(row["minimum_sampled_value"]) > 0 for row in totals
            ),
        },
        "cases": cases,
        "legacy_aggregate_comparison": {
            "legacy_status": legacy["status"],
            "rank_slices": legacy_slices,
            "all_aggregate_counts_matched": True,
            "new_information": "ordered exact coefficient digests for every cell",
        },
        "dependency_sha256": actual_hashes,
        "proof_boundary": (
            "This covers only the Delta2/Delta3 e=1 subdivided-claw terminal "
            "residual at the newly inserted endpoint leaf.  Old roots, arbitrary "
            "trees, full Q8/PGC, forest unimodality, and Erdos Problem 993 are outside."
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
