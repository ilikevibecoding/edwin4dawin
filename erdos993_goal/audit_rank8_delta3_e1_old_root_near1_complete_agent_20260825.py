#!/usr/bin/env python3
"""Independent literal adjacency-list/tree-DP audit of Delta3 e=1 near=1."""

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
CERTIFICATE = HERE / "rank8_delta3_e1_old_root_near1_complete_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta3_e1_old_root_near1_complete_independent_audit_agent_20260825.json"
MAX_RANK = 8
RANK = 3
NEAR = 1
THRESHOLD = 18
DEGREE = 26
SPLIT = 5
EXTENSIONS = ("root", "short", "long")
COORDINATE = {"tail": 0, "short": 1, "difference": 2}
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "prove_rank8_delta3_e1_old_root_near1_complete_agent_20260825.py":
        "D992E689A23EE27506E24EA783D530604E1459FD0C4F31F65CD7254CB3F305D3",
    "rank8_delta3_e1_old_root_near1_complete_exact_agent_20260825.json":
        "B3E98DE6989AC6D8F22401F420604AA6673E67606B69381BFD11F7C29A7D4888",
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
    out = [0] * (MAX_RANK + 1)
    for first, left_value in enumerate(left):
        if not left_value:
            continue
        for second, right_value in enumerate(right[: MAX_RANK + 1 - first]):
            if right_value:
                out[first + second] += left_value * right_value
    return tuple(out)


def times_x(polynomial: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + polynomial[:MAX_RANK]


def build_literal_claw(
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
    assert sum(map(len, adjacency)) // 2 == len(adjacency) - 1
    return tuple(tuple(row) for row in adjacency), old_root


def forest_polynomial(
    adjacency: tuple[tuple[int, ...], ...], deleted: int | None
) -> tuple[int, ...]:
    seen = set() if deleted is None else {deleted}

    def visit(vertex: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        seen.add(vertex)
        excluded = (1,) + (0,) * MAX_RANK
        included_children = (1,) + (0,) * MAX_RANK
        for neighbor in adjacency[vertex]:
            if neighbor == parent or neighbor == deleted:
                continue
            child_excluded, child_included = visit(neighbor, vertex)
            excluded = poly_mul(excluded, poly_add(child_excluded, child_included))
            included_children = poly_mul(included_children, child_excluded)
        return excluded, times_x(included_children)

    answer = (1,) + (0,) * MAX_RANK
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        excluded, included = visit(vertex, -1)
        answer = poly_mul(answer, poly_add(excluded, included))
    return answer


@cache
def tree_profile(
    arms: tuple[int, int, int]
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    adjacency, old_root = build_literal_claw(arms)
    core = forest_polynomial(adjacency, None)
    deleted = forest_polynomial(adjacency, old_root)
    order = len(adjacency)
    assert order == 1 + sum(arms)
    assert core[0] == 1 and core[1] == order
    assert core[2] == (order - 1) * (order - 2) // 2
    assert deleted[0] == 1 and deleted[1] == order - 1
    return core, deleted


def make_evaluator():
    variables = (*c[:9], h[6], h[7])
    terms = sp.Poly(
        newton_coefficients(residual())[RANK], *variables, domain=sp.QQ
    ).terms()

    def evaluate(values: tuple[int, ...]) -> int:
        total = sp.S.Zero
        for monomial, coefficient in terms:
            term = coefficient
            for value, exponent in zip(values, monomial):
                if exponent:
                    term *= value**exponent
            total += term
        assert total.q == 1
        return int(total)

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
    old_core, old_deleted = tree_profile(old_arms)
    new_core, new_deleted = tree_profile(tuple(new_arms))
    assert EVALUATE is not None
    old_value = EVALUATE((*old_core[:9], old_deleted[6], old_deleted[7]))
    new_value = EVALUATE((*new_core[:9], new_deleted[6], new_deleted[7]))
    return new_value - old_value


def finite_differences(line: list[int]) -> list[int]:
    result = []
    current = line
    while current:
        result.append(current[0])
        current = [
            current[index + 1] - current[index]
            for index in range(len(current) - 1)
        ]
    return result


def transform(values: np.ndarray, axis: int) -> None:
    moved = np.moveaxis(values, axis, 0)
    for index in np.ndindex(moved.shape[1:]):
        line = [int(moved[(position,) + index]) for position in range(moved.shape[0])]
        for position, value in enumerate(finite_differences(line)):
            moved[(position,) + index] = value


def digest(values: np.ndarray) -> dict[str, object]:
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
        transform(values, axis)
    return minimum_sampled, digest(values)


def compare_region(extension: str, row: dict[str, object]) -> dict[str, object]:
    shifts = tuple(row["shifts_tail_short_difference"])
    active = tuple(COORDINATE[name] for name in row["active_coordinates"])
    minimum_sampled, actual = replay_array(extension, shifts, active)
    assert actual == row["newton"], (extension, shifts, active)
    assert str(minimum_sampled) == row["minimum_sampled_increment"]
    return actual


def expected_original(extension: str) -> set[tuple[object, ...]]:
    expected = {(extension, (THRESHOLD, 0, 0), ("tail", "short", "difference"))}
    for tail in range(THRESHOLD):
        remainder = THRESHOLD - tail
        short_lower = (remainder + 1) // 2
        expected.add((extension, (tail, short_lower, 0), ("short", "difference")))
        for short in range(short_lower):
            lower = remainder - 2 * short
            expected.add((extension, (tail, short, lower), ("difference",)))
    assert len(expected) == 109
    return expected


def original_key(row: dict[str, object]) -> tuple[object, ...]:
    return (
        row["extension"],
        tuple(row["shifts_tail_short_difference"]),
        tuple(row["active_coordinates"]),
    )


def replay_ray(extension: str, row: dict[str, object]) -> tuple[int, int]:
    tail = row["tail"]
    short = row["short"]
    lower = row["original_difference_lower"]
    shifted = row["tail_difference_lower"]
    prefix = [increment(extension, tail, short, value) for value in range(lower, shifted)]
    samples = [
        increment(extension, tail, short, shifted + offset)
        for offset in range(DEGREE + 1)
    ]
    coefficients = finite_differences(samples)
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
        "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR1_ALL_ORDER_ALL_EXTENSIONS"
    )
    assert certificate["rank"] == RANK and certificate["near"] == NEAR
    assert certificate["split"] == SPLIT
    assert certificate["source_order_condition"] == (
        "tail+2*short+difference>=18"
    )
    EVALUATE, source_terms = make_evaluator()
    assert source_terms == certificate["source_expression_terms"]

    originals = certificate["original_rows"]
    assert len(originals) == 327
    for extension in EXTENSIONS:
        keys = {
            original_key(row)
            for row in originals
            if row["extension"] == extension
        }
        assert keys == expected_original(extension)

    original_count = passing_count = mixed_count = 0
    mixed_keys = set()
    for row in originals:
        actual = compare_region(row["extension"], row)
        assert int(actual["origin"]) > 0
        assert int(row["minimum_sampled_increment"]) > 0
        original_count += 1
        if actual["negative"] == 0:
            passing_count += 1
        else:
            mixed_count += 1
            mixed_keys.add((row["extension"], row["label"]))
        if original_count % 40 == 0:
            print("AUDIT_ORIGINAL_PROGRESS", original_count, flush=True)
    assert (original_count, passing_count, mixed_count) == (327, 270, 57)
    print("AUDIT_ORIGINAL_COMPLETE", original_count, flush=True)

    refinements = certificate["refinements"]
    covered: Counter[tuple[str, str]] = Counter()
    prefix_values = ray_coefficients = 0
    univariate_count = 0
    for row in refinements["univariate"]:
        extension = row["extension"]
        prefix_count, coefficient_count = replay_ray(extension, row)
        prefix_values += prefix_count
        ray_coefficients += coefficient_count
        covered[(extension, row["original_cell_label"])] += 1
        univariate_count += 1
    assert univariate_count == 30
    print("AUDIT_UNIVARIATE_COMPLETE", univariate_count, flush=True)

    bivariate_bulk = bivariate_rays = 0
    for row in refinements["bivariate"]:
        extension = row["extension"]
        actual = compare_region(extension, row["bulk"])
        assert actual["negative"] == 0 and int(actual["origin"]) > 0
        covered[(extension, row["original_cell_label"])] += 1
        bivariate_bulk += 1
        assert row["split_short"] == SPLIT
        assert {strip["short"] for strip in row["fixed_short_strips"]} == set(
            range(row["original_short_lower"], SPLIT)
        )
        for strip in row["fixed_short_strips"]:
            prefix_count, coefficient_count = replay_ray(extension, strip)
            prefix_values += prefix_count
            ray_coefficients += coefficient_count
            bivariate_rays += 1
    assert (bivariate_bulk, bivariate_rays) == (24, 60)
    print("AUDIT_BIVARIATE_COMPLETE", bivariate_bulk, bivariate_rays, flush=True)

    trivariate_count = 0
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
            trivariate_count += 1
            if trivariate_count % 15 == 0:
                print("AUDIT_TRIVARIATE_PROGRESS", trivariate_count, flush=True)
    assert trivariate_count == 93
    assert set(covered) == mixed_keys
    assert set(covered.values()) == {1}
    assert prefix_values == certificate["coverage_totals"]["literal_finite_prefix_values"]
    assert ray_coefficients == certificate["coverage_totals"]["shifted_ray_newton_coefficients"]

    payload = {
        "schema": "rank8-delta3-e1-old-root-near1-complete-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR1_COMPLETE",
        "audited_theorem_status": certificate["status"],
        "independence": {
            "imports_near0_or_near2_certificate_or_conclusion": False,
            "imports_delta2_certificate_or_conclusion": False,
            "imports_producer_refinement_or_path_code": False,
            "graph_model": "fresh adjacency-list subdivided claws with root at arm distance 2",
            "coefficient_engine": "generic include/exclude forest DP truncated through rank 8",
            "sign_engine": "fresh exact multidimensional integer forward differences",
            "shared_definition_only": "canonical terminal residual from verify_rank8_q8_terminal_reduction.py",
        },
        "source_expression_terms": source_terms,
        "replayed": {
            "original_partition_cells": original_count,
            "original_coefficientwise_cells": passing_count,
            "original_mixed_cells": mixed_count,
            "univariate_refined_cells": univariate_count,
            "bivariate_bulk_tensors": bivariate_bulk,
            "bivariate_fixed_short_rays": bivariate_rays,
            "trivariate_partition_regions": trivariate_count,
            "literal_finite_prefix_values": prefix_values,
            "shifted_ray_newton_coefficients": ray_coefficients,
            "all_stored_ordered_coefficient_digests_matched": True,
            "all_stored_literal_prefixes_matched": True,
            "all_57_original_obstructions_covered_exactly_once": True,
            "all_proving_newton_coefficients_nonnegative": True,
            "all_proving_origins_positive": True,
        },
        "coverage_checks": {
            "original_threshold18_partition_exact_per_extension": True,
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
