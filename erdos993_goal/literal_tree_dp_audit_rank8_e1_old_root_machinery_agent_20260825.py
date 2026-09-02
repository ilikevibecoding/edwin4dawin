#!/usr/bin/env python3
"""Independent literal-tree replay machinery for e=1 old-root certificates.

This module imports no producer, refinement, or path-polynomial code and makes
no theorem claim.  It reconstructs subdivided claws as adjacency lists and
audits a supplied certificate with generic include/exclude forest DP.
"""

from __future__ import annotations

import hashlib
from collections import Counter
from functools import cache

import numpy as np
import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


MAX_RANK = 8
EXTENSIONS = ("root", "short", "long")
COORDINATE = {"tail": 0, "short": 1, "difference": 2}


def audit_certificate(
    certificate: dict[str, object],
    *,
    expected_status: str,
    rank: int,
    near: int,
    threshold: int,
    degree: int,
    split: int = 5,
) -> dict[str, object]:
    assert certificate["status"] == expected_status
    assert certificate["rank"] == rank
    assert certificate["near"] == near
    assert certificate["split"] == split

    def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
        return tuple(left[index] + right[index] for index in range(MAX_RANK + 1))

    def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
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

    def literal_claw(
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
                if arm == 0 and distance == near + 1:
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

        def visit(
            vertex: int, parent: int
        ) -> tuple[tuple[int, ...], tuple[int, ...]]:
            seen.add(vertex)
            excluded = (1,) + (0,) * MAX_RANK
            included_children = (1,) + (0,) * MAX_RANK
            for neighbor in adjacency[vertex]:
                if neighbor == parent or neighbor == deleted:
                    continue
                child_excluded, child_included = visit(neighbor, vertex)
                excluded = multiply(excluded, add(child_excluded, child_included))
                included_children = multiply(included_children, child_excluded)
            return excluded, times_x(included_children)

        result = (1,) + (0,) * MAX_RANK
        for vertex in range(len(adjacency)):
            if vertex in seen:
                continue
            excluded, included = visit(vertex, -1)
            result = multiply(result, add(excluded, included))
        return result

    @cache
    def tree_profile(
        arms: tuple[int, int, int]
    ) -> tuple[tuple[int, ...], tuple[int, ...]]:
        adjacency, old_root = literal_claw(arms)
        core = forest_polynomial(adjacency, None)
        deleted = forest_polynomial(adjacency, old_root)
        order = len(adjacency)
        assert order == 1 + sum(arms)
        assert core[0] == 1 and core[1] == order
        assert core[2] == (order - 1) * (order - 2) // 2
        assert deleted[0] == 1 and deleted[1] == order - 1
        return core, deleted

    variables = (*c[:9], h[6], h[7])
    terms = sp.Poly(
        newton_coefficients(residual())[rank], *variables, domain=sp.QQ
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

    @cache
    def increment(extension: str, tail: int, short: int, difference: int) -> int:
        old_arms = (
            near + tail + 1,
            short + 1,
            short + difference + 1,
        )
        new_arms = list(old_arms)
        new_arms[{"root": 0, "short": 1, "long": 2}[extension]] += 1
        old_core, old_deleted = tree_profile(old_arms)
        new_core, new_deleted = tree_profile(tuple(new_arms))
        old_value = evaluate((*old_core[:9], old_deleted[6], old_deleted[7]))
        new_value = evaluate((*new_core[:9], new_deleted[6], new_deleted[7]))
        return new_value - old_value

    def differences(line: list[int]) -> list[int]:
        coefficients = []
        current = line
        while current:
            coefficients.append(current[0])
            current = [
                current[index + 1] - current[index]
                for index in range(len(current) - 1)
            ]
        return coefficients

    def transform(values: np.ndarray, axis: int) -> None:
        moved = np.moveaxis(values, axis, 0)
        for index in np.ndindex(moved.shape[1:]):
            line = [
                int(moved[(position,) + index])
                for position in range(moved.shape[0])
            ]
            for position, value in enumerate(differences(line)):
                moved[(position,) + index] = value

    def digest(values: np.ndarray) -> dict[str, object]:
        coefficients = [int(entry) for entry in values.flat]
        ordered = hashlib.sha256()
        for index in np.ndindex(values.shape):
            ordered.update(
                (
                    ",".join(map(str, index))
                    + ":"
                    + str(int(values[index]))
                    + "\n"
                ).encode()
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
        values = np.empty((degree + 1,) * len(active), dtype=object)
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
        expected = {
            (extension, (threshold, 0, 0), ("tail", "short", "difference"))
        }
        for tail in range(threshold):
            remainder = threshold - tail
            short_lower = (remainder + 1) // 2
            expected.add(
                (extension, (tail, short_lower, 0), ("short", "difference"))
            )
            for short in range(short_lower):
                lower = remainder - 2 * short
                expected.add((extension, (tail, short, lower), ("difference",)))
        expected_count = 1 + threshold + sum(
            (remainder + 1) // 2 for remainder in range(1, threshold + 1)
        )
        assert len(expected) == expected_count
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
        prefix = [
            increment(extension, tail, short, value)
            for value in range(lower, shifted)
        ]
        samples = [
            increment(extension, tail, short, shifted + offset)
            for offset in range(degree + 1)
        ]
        coefficients = differences(samples)
        assert [str(entry) for entry in prefix] == row["finite_prefix_values"]
        assert [str(entry) for entry in coefficients] == row[
            "tail_newton_coefficients"
        ]
        assert all(entry > 0 for entry in prefix)
        assert coefficients[0] > 0 and min(coefficients) >= 0
        return len(prefix), len(coefficients)

    originals = certificate["original_rows"]
    expected_per_extension = len(expected_original("root"))
    assert len(originals) == len(EXTENSIONS) * expected_per_extension
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
    assert original_count == certificate["coverage_totals"]["original_cells"]
    assert passing_count == certificate["coverage_totals"][
        "original_coefficientwise_cells"
    ]
    assert mixed_count == certificate["coverage_totals"][
        "original_obstructed_cells_replaced"
    ]
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
    print("AUDIT_UNIVARIATE_COMPLETE", univariate_count, flush=True)

    bivariate_bulk = bivariate_rays = 0
    for row in refinements["bivariate"]:
        extension = row["extension"]
        actual = compare_region(extension, row["bulk"])
        assert actual["negative"] == 0 and int(actual["origin"]) > 0
        covered[(extension, row["original_cell_label"])] += 1
        bivariate_bulk += 1
        assert row["split_short"] == split
        assert {strip["short"] for strip in row["fixed_short_strips"]} == set(
            range(row["original_short_lower"], split)
        )
        for strip in row["fixed_short_strips"]:
            prefix_count, coefficient_count = replay_ray(extension, strip)
            prefix_values += prefix_count
            ray_coefficients += coefficient_count
            bivariate_rays += 1
    print("AUDIT_BIVARIATE_COMPLETE", bivariate_bulk, bivariate_rays, flush=True)

    trivariate_count = 0
    for extension in EXTENSIONS:
        selected = [
            row
            for row in refinements["trivariate"]
            if row["extension"] == extension
        ]
        expected = {
            (threshold, split, 0, ("tail", "short", "difference"))
        }
        for short in range(split):
            expected.add((threshold, short, split, ("tail", "difference")))
            for difference in range(split):
                expected.add((threshold, short, difference, ("tail",)))
        actual_partition = {
            (
                *row["shifts_tail_short_difference"],
                tuple(row["active_coordinates"]),
            )
            for row in selected
        }
        assert actual_partition == expected
        covered[(extension, f"tail>={threshold}")] += 1
        for row in selected:
            actual = compare_region(extension, row)
            assert actual["negative"] == 0 and int(actual["origin"]) > 0
            trivariate_count += 1
            if trivariate_count % 15 == 0:
                print("AUDIT_TRIVARIATE_PROGRESS", trivariate_count, flush=True)

    assert univariate_count == certificate["coverage_totals"][
        "univariate_refined_cells"
    ]
    assert bivariate_bulk == certificate["coverage_totals"][
        "bivariate_bulk_tensors"
    ]
    assert bivariate_rays == certificate["coverage_totals"][
        "fixed_short_shifted_rays"
    ]
    assert trivariate_count == certificate["coverage_totals"][
        "trivariate_partition_regions"
    ]
    assert set(covered) == mixed_keys
    assert set(covered.values()) == {1}
    assert prefix_values == certificate["coverage_totals"][
        "literal_finite_prefix_values"
    ]
    assert ray_coefficients == certificate["coverage_totals"][
        "shifted_ray_newton_coefficients"
    ]

    return {
        "source_expression_terms": len(terms),
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
            "all_original_obstructions_covered_exactly_once": True,
            "all_proving_newton_coefficients_nonnegative": True,
            "all_proving_origins_positive": True,
        },
        "coverage_checks": {
            f"original_threshold{threshold}_partition_exact_per_extension": True,
            f"bivariate_short{split}_partition_no_gap": True,
            f"trivariate_short{split}_difference{split}_partition_no_gap": True,
            "finite_prefix_plus_shifted_tail_no_gap": True,
        },
        "independence": {
            "imports_producer_refinement_or_path_code": False,
            "graph_model": (
                "fresh adjacency-list subdivided claws with root at arm distance "
                f"{near + 1}"
            ),
            "coefficient_engine": (
                "generic include/exclude forest DP truncated through rank 8"
            ),
            "sign_engine": "fresh exact multidimensional integer forward differences",
            "shared_definition_only": (
                "canonical terminal residual from verify_rank8_q8_terminal_reduction.py"
            ),
        },
    }
