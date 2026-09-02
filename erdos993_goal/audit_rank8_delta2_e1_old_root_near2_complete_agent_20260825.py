#!/usr/bin/env python3
"""Independent adjacency-list/tree-DP audit of Delta2 e=1 near=2.

No producer, refinement-helper, or path-polynomial module is imported.  The
audit builds literal trees, runs generic include/exclude forest DP through
rank eight, and regenerates every exact forward-difference certificate.
"""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter
from functools import cache
from pathlib import Path

import numpy as np
import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta2_e1_old_root_near2_complete_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta2_e1_old_root_near2_complete_independent_audit_agent_20260825.json"
MAX_RANK = 8
RANK = 2
NEAR = 2
THRESHOLD = 17
DEGREE = 27
SPLIT = 5
EXTENSIONS = ("root", "short", "long")
COORDINATE = {"tail": 0, "short": 1, "difference": 2}
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_e1_old_root_refinement_machinery_agent_20260825.py":
        "2771F20D90E1F7BC6016FA20FA375548413BD3EB7B88454510C3919D254804AE",
    "prove_rank8_delta2_e1_old_root_near2_complete_agent_20260825.py":
        "810DFBB92AFE9E8EF438EB8C878155D8929F79CC71858144944431EAFD845F6D",
    "rank8_delta2_e1_old_root_near2_complete_exact_agent_20260825.json":
        "3EA6C013BFFA1BD91DAB4471B710482AE92F3B0737C021E9280D9DF16DDD009D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def poly_add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[index] + right[index] for index in range(MAX_RANK + 1))


def poly_mul(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    result = [0] * (MAX_RANK + 1)
    for first, left_value in enumerate(left):
        if left_value == 0:
            continue
        for second, right_value in enumerate(right[: MAX_RANK + 1 - first]):
            if right_value:
                result[first + second] += left_value * right_value
    return tuple(result)


def x_times(polynomial: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + polynomial[:MAX_RANK]


def build_subdivided_claw(
    arms: tuple[int, int, int],
) -> tuple[tuple[tuple[int, ...], ...], int]:
    adjacency: list[list[int]] = [[]]
    old_root = -1
    for arm, length in enumerate(arms):
        previous = 0
        for distance in range(1, length + 1):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            if arm == 0 and distance == NEAR + 1:
                old_root = vertex
            previous = vertex
    assert old_root > 0
    assert len(adjacency[0]) == 3
    assert sum(len(row) for row in adjacency) // 2 == len(adjacency) - 1
    return tuple(tuple(row) for row in adjacency), old_root


def generic_forest_polynomial(
    adjacency: tuple[tuple[int, ...], ...], deleted: int | None
) -> tuple[int, ...]:
    seen = set() if deleted is None else {deleted}

    def rooted(vertex: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        seen.add(vertex)
        absent = (1,) + (0,) * MAX_RANK
        present_children = (1,) + (0,) * MAX_RANK
        for child in adjacency[vertex]:
            if child == parent or child == deleted:
                continue
            child_absent, child_present = rooted(child, vertex)
            absent = poly_mul(absent, poly_add(child_absent, child_present))
            present_children = poly_mul(present_children, child_absent)
        return absent, x_times(present_children)

    result = (1,) + (0,) * MAX_RANK
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        absent, present = rooted(vertex, -1)
        result = poly_mul(result, poly_add(absent, present))
    return result


@cache
def graph_profile(
    arms: tuple[int, int, int]
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    adjacency, old_root = build_subdivided_claw(arms)
    core = generic_forest_polynomial(adjacency, None)
    deleted = generic_forest_polynomial(adjacency, old_root)
    order = len(adjacency)
    assert order == 1 + sum(arms)
    assert core[0] == 1 and core[1] == order
    assert core[2] == (order - 1) * (order - 2) // 2
    assert deleted[0] == 1 and deleted[1] == order - 1
    return core, deleted


def build_residual_evaluator():
    variables = (*c[:9], h[6], h[7])
    terms = sp.Poly(
        newton_coefficients(residual())[RANK], *variables, domain=sp.QQ
    ).terms()

    def evaluate(values: tuple[int, ...]) -> int:
        answer = sp.S.Zero
        for monomial, coefficient in terms:
            term = coefficient
            for value, exponent in zip(values, monomial):
                if exponent:
                    term *= value**exponent
            answer += term
        assert answer.q == 1
        return int(answer)

    return evaluate, len(terms)


EVALUATE = None


@cache
def increment(extension: str, tail: int, short: int, difference: int) -> int:
    old_arms = (
        NEAR + tail + 1,
        short + 1,
        short + difference + 1,
    )
    new_arms = list(old_arms)
    new_arms[{"root": 0, "short": 1, "long": 2}[extension]] += 1
    old_core, old_deleted = graph_profile(old_arms)
    new_core, new_deleted = graph_profile(tuple(new_arms))
    assert EVALUATE is not None
    old_value = EVALUATE((*old_core[:9], old_deleted[6], old_deleted[7]))
    new_value = EVALUATE((*new_core[:9], new_deleted[6], new_deleted[7]))
    return new_value - old_value


def forward_differences(line: list[int]) -> list[int]:
    coefficients = []
    current = line
    while current:
        coefficients.append(current[0])
        current = [
            current[index + 1] - current[index]
            for index in range(len(current) - 1)
        ]
    return coefficients


def transform_axis(values: np.ndarray, axis: int) -> None:
    moved = np.moveaxis(values, axis, 0)
    for index in np.ndindex(moved.shape[1:]):
        line = [
            int(moved[(position,) + index]) for position in range(moved.shape[0])
        ]
        for position, value in enumerate(forward_differences(line)):
            moved[(position,) + index] = value


def ordered_record(values: np.ndarray) -> dict[str, object]:
    coefficients = [int(entry) for entry in values.flat]
    ordered = hashlib.sha256()
    for index in np.ndindex(values.shape):
        ordered.update(
            (",".join(map(str, index)) + ":" + str(int(values[index])) + "\n").encode()
        )
    return {
        "shape": list(values.shape),
        "coefficients": len(coefficients),
        "negative": sum(entry < 0 for entry in coefficients),
        "zero": sum(entry == 0 for entry in coefficients),
        "positive": sum(entry > 0 for entry in coefficients),
        "minimum": str(min(coefficients)),
        "origin": str(int(values[(0,) * values.ndim])),
        "ordered_sha256": ordered.hexdigest().upper(),
    }


def replay_array(
    extension: str,
    shifts: tuple[int, int, int],
    active: tuple[int, ...],
) -> tuple[int, dict[str, object]]:
    values = np.empty((DEGREE + 1,) * len(active), dtype=object)
    for index in np.ndindex(values.shape):
        parameters = list(shifts)
        for axis, coordinate in enumerate(active):
            parameters[coordinate] += index[axis]
        values[index] = increment(extension, *parameters)
    minimum_sampled = min(int(entry) for entry in values.flat)
    for axis in range(len(active)):
        transform_axis(values, axis)
    return minimum_sampled, ordered_record(values)


def compare_region(extension: str, row: dict[str, object]) -> dict[str, object]:
    shifts = tuple(row["shifts_tail_short_difference"])
    active = tuple(COORDINATE[name] for name in row["active_coordinates"])
    minimum_sampled, actual = replay_array(extension, shifts, active)
    assert actual == row["newton"], (extension, shifts, active)
    assert str(minimum_sampled) == row["minimum_sampled_increment"]
    return actual


def expected_original_cells(extension: str) -> set[tuple[object, ...]]:
    expected = {(extension, (THRESHOLD, 0, 0), ("tail", "short", "difference"))}
    for tail in range(THRESHOLD):
        remainder = THRESHOLD - tail
        short_lower = (remainder + 1) // 2
        expected.add((extension, (tail, short_lower, 0), ("short", "difference")))
        for short in range(short_lower):
            difference_lower = remainder - 2 * short
            expected.add(
                (extension, (tail, short, difference_lower), ("difference",))
            )
    assert len(expected) == 99
    return expected


def original_key(row: dict[str, object]) -> tuple[object, ...]:
    return (
        row["extension"],
        tuple(row["shifts_tail_short_difference"]),
        tuple(row["active_coordinates"]),
    )


def replay_shifted_ray(extension: str, row: dict[str, object]) -> tuple[int, int]:
    tail = row["tail"]
    short = row["short"]
    lower = row["original_difference_lower"]
    shifted = row["tail_difference_lower"]
    prefix = [increment(extension, tail, short, value) for value in range(lower, shifted)]
    samples = [
        increment(extension, tail, short, shifted + offset)
        for offset in range(DEGREE + 1)
    ]
    coefficients = forward_differences(samples)
    assert [str(entry) for entry in prefix] == row["finite_prefix_values"]
    assert [str(entry) for entry in coefficients] == row["tail_newton_coefficients"]
    assert all(entry > 0 for entry in prefix)
    assert coefficients[0] > 0 and min(coefficients) >= 0
    return len(prefix), len(coefficients)


def main() -> None:
    global EVALUATE
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == (
        "PASS_EXACT_DELTA2_E1_OLD_ROOT_NEAR2_ALL_ORDER_ALL_EXTENSIONS"
    )
    assert certificate["near"] == NEAR and certificate["split"] == SPLIT
    assert certificate["source_order_condition"] == (
        "tail+2*short+difference>=17"
    )
    EVALUATE, source_terms = build_residual_evaluator()
    assert source_terms == certificate["source_expression_terms"]

    originals = certificate["original_rows"]
    assert len(originals) == 297
    for extension in EXTENSIONS:
        actual = {
            original_key(row)
            for row in originals
            if row["extension"] == extension
        }
        assert actual == expected_original_cells(extension)

    original_replayed = original_passing = original_mixed = 0
    mixed_keys = set()
    for row in originals:
        actual = compare_region(row["extension"], row)
        assert int(actual["origin"]) > 0
        assert int(row["minimum_sampled_increment"]) > 0
        original_replayed += 1
        if actual["negative"] == 0:
            original_passing += 1
        else:
            original_mixed += 1
            mixed_keys.add((row["extension"], row["label"]))
        if original_replayed % 40 == 0:
            print("AUDIT_ORIGINAL_PROGRESS", original_replayed, flush=True)
    assert (original_replayed, original_passing, original_mixed) == (297, 240, 57)
    print("AUDIT_ORIGINAL_COMPLETE", original_replayed, flush=True)

    refinements = certificate["refinements"]
    covered: Counter[tuple[str, str]] = Counter()
    literal_prefixes = shifted_coefficients = 0
    univariate_replayed = 0
    for row in refinements["univariate"]:
        extension = row["extension"]
        prefix_count, coefficient_count = replay_shifted_ray(extension, row)
        literal_prefixes += prefix_count
        shifted_coefficients += coefficient_count
        covered[(extension, row["original_cell_label"])] += 1
        univariate_replayed += 1
    assert univariate_replayed == 30
    print("AUDIT_UNIVARIATE_COMPLETE", univariate_replayed, flush=True)

    bivariate_bulk = bivariate_rays = 0
    for row in refinements["bivariate"]:
        extension = row["extension"]
        actual = compare_region(extension, row["bulk"])
        assert actual["negative"] == 0 and int(actual["origin"]) > 0
        covered[(extension, row["original_cell_label"])] += 1
        bivariate_bulk += 1
        assert row["split_short"] == SPLIT
        expected_shorts = set(range(row["original_short_lower"], SPLIT))
        actual_shorts = {strip["short"] for strip in row["fixed_short_strips"]}
        assert actual_shorts == expected_shorts
        for strip in row["fixed_short_strips"]:
            prefix_count, coefficient_count = replay_shifted_ray(extension, strip)
            literal_prefixes += prefix_count
            shifted_coefficients += coefficient_count
            bivariate_rays += 1
    assert (bivariate_bulk, bivariate_rays) == (24, 60)
    print("AUDIT_BIVARIATE_COMPLETE", bivariate_bulk, bivariate_rays, flush=True)

    trivariate_replayed = 0
    for extension in EXTENSIONS:
        selected = [
            row for row in refinements["trivariate"]
            if row["extension"] == extension
        ]
        expected = {(THRESHOLD, SPLIT, 0, ("tail", "short", "difference"))}
        for short in range(SPLIT):
            expected.add((THRESHOLD, short, SPLIT, ("tail", "difference")))
            for difference in range(SPLIT):
                expected.add((THRESHOLD, short, difference, ("tail",)))
        actual_partition = {
            (*row["shifts_tail_short_difference"], tuple(row["active_coordinates"]))
            for row in selected
        }
        assert actual_partition == expected
        covered[(extension, f"tail>={THRESHOLD}")] += 1
        for row in selected:
            actual = compare_region(extension, row)
            assert actual["negative"] == 0 and int(actual["origin"]) > 0
            trivariate_replayed += 1
            if trivariate_replayed % 15 == 0:
                print("AUDIT_TRIVARIATE_PROGRESS", trivariate_replayed, flush=True)
    assert trivariate_replayed == 93
    assert set(covered) == mixed_keys
    assert set(covered.values()) == {1}
    assert literal_prefixes == certificate["coverage_totals"]["literal_finite_prefix_values"]
    assert shifted_coefficients == certificate["coverage_totals"]["shifted_ray_newton_coefficients"]

    payload = {
        "schema": "rank8-delta2-e1-old-root-near2-complete-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA2_E1_OLD_ROOT_NEAR2_COMPLETE",
        "audited_theorem_status": certificate["status"],
        "independence": {
            "imports_producer_refinement_or_path_code": False,
            "graph_model": "fresh adjacency-list subdivided claws with root at arm distance 3",
            "coefficient_engine": "generic include/exclude forest DP truncated through rank 8",
            "sign_engine": "fresh exact multidimensional integer forward differences",
            "shared_definition_only": "canonical terminal residual from verify_rank8_q8_terminal_reduction.py",
        },
        "source_expression_terms": source_terms,
        "replayed": {
            "original_partition_cells": original_replayed,
            "original_coefficientwise_cells": original_passing,
            "original_mixed_cells": original_mixed,
            "univariate_refined_cells": univariate_replayed,
            "bivariate_bulk_tensors": bivariate_bulk,
            "bivariate_fixed_short_rays": bivariate_rays,
            "trivariate_partition_regions": trivariate_replayed,
            "literal_finite_prefix_values": literal_prefixes,
            "shifted_ray_newton_coefficients": shifted_coefficients,
            "all_stored_ordered_coefficient_digests_matched": True,
            "all_stored_literal_prefixes_matched": True,
            "all_57_original_obstructions_covered_exactly_once": True,
            "all_proving_newton_coefficients_nonnegative": True,
            "all_proving_origins_positive": True,
        },
        "coverage_checks": {
            "original_threshold17_partition_exact_per_extension": True,
            "bivariate_short5_partition_no_gap": True,
            "trivariate_short5_difference5_partition_no_gap": True,
            "finite_prefix_plus_shifted_tail_no_gap": True,
        },
        "dependency_sha256": actual_hashes,
        "proof_boundary": certificate["proof_boundary"],
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("REPLAYED", payload["replayed"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
