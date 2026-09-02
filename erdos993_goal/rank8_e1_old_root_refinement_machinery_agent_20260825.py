#!/usr/bin/env python3
"""Parameterized exact Newton refinement machinery for e=1 old-root cells.

This module contains arithmetic and partition construction only.  It makes no
standalone theorem claim.  A caller supplies rank, root distance, threshold,
and degree; every proposed split is accepted only after exact sign checks.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np

from certify_rank8_e1_new_leaf_newton_cell import (
    difference_coefficients,
    evaluator,
    transform_axis,
)
from certify_rank8_e1_old_root_increment_ordered_near_cell import increment_value


EXTENSIONS = ("root", "short", "long")
COORDINATES = ("tail", "short", "difference")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def array_digest(values: np.ndarray) -> dict[str, object]:
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


def newton_cell(
    evaluate,
    extension: str,
    near: int,
    degree: int,
    shifts: tuple[int, int, int],
    active: tuple[int, ...],
) -> dict[str, object]:
    shape = (degree + 1,) * len(active)
    values = np.empty(shape, dtype=object)
    for index in np.ndindex(shape):
        parameters = list(shifts)
        for axis, coordinate in enumerate(active):
            parameters[coordinate] += index[axis]
        values[index] = increment_value(evaluate, extension, near, *parameters)
    minimum_sampled = min(int(entry) for entry in values.flat)
    for axis in range(len(active)):
        transform_axis(values, axis)
    return {
        "shifts_tail_short_difference": list(shifts),
        "active_coordinates": [COORDINATES[coordinate] for coordinate in active],
        "minimum_sampled_increment": str(minimum_sampled),
        "newton": array_digest(values),
    }


def shifted_difference_ray(
    evaluate,
    extension: str,
    near: int,
    degree: int,
    tail: int,
    short: int,
    lower: int,
    search_limit: int = 100,
) -> dict[str, object]:
    def value(difference: int) -> int:
        return increment_value(evaluate, extension, near, tail, short, difference)

    shifted = lower
    while True:
        samples = [value(shifted + offset) for offset in range(degree + 1)]
        coefficients = difference_coefficients(samples)
        if coefficients[0] > 0 and min(coefficients) >= 0:
            break
        shifted += 1
        assert shifted <= lower + search_limit, (
            extension,
            near,
            tail,
            short,
            lower,
        )
    prefix = [value(difference) for difference in range(lower, shifted)]
    assert all(entry > 0 for entry in prefix)
    return {
        "tail": tail,
        "short": short,
        "original_difference_lower": lower,
        "tail_difference_lower": shifted,
        "finite_prefix_count": len(prefix),
        "finite_prefix_values": [str(entry) for entry in prefix],
        "tail_newton_coefficients": [str(entry) for entry in coefficients],
        "tail_negative": sum(entry < 0 for entry in coefficients),
        "tail_zero": sum(entry == 0 for entry in coefficients),
        "tail_positive": sum(entry > 0 for entry in coefficients),
        "tail_origin": str(coefficients[0]),
        "minimum_prefix_value": str(min(prefix)) if prefix else None,
        "minimum_tail_coefficient": str(min(coefficients)),
        "coverage": (
            f"difference={lower},...,{shifted - 1} pointwise and "
            f"difference>={shifted} by the binomial(difference-{shifted},j) expansion"
        ),
    }


def original_partition(
    evaluate,
    extension: str,
    near: int,
    threshold: int,
    degree: int,
) -> list[dict[str, object]]:
    rows = [
        {
            "label": f"tail>={threshold}",
            "dimension": 3,
            **newton_cell(
                evaluate,
                extension,
                near,
                degree,
                (threshold, 0, 0),
                (0, 1, 2),
            ),
        }
    ]
    for tail in range(threshold):
        remainder = threshold - tail
        short_lower = (remainder + 1) // 2
        rows.append(
            {
                "label": f"tail={tail}, short>=ceil({remainder}/2)={short_lower}",
                "dimension": 2,
                **newton_cell(
                    evaluate,
                    extension,
                    near,
                    degree,
                    (tail, short_lower, 0),
                    (1, 2),
                ),
            }
        )
        for short in range(short_lower):
            difference_lower = remainder - 2 * short
            rows.append(
                {
                    "label": (
                        f"tail={tail}, short={short}, difference>={difference_lower}"
                    ),
                    "dimension": 1,
                    **newton_cell(
                        evaluate,
                        extension,
                        near,
                        degree,
                        (tail, short, difference_lower),
                        (2,),
                    ),
                }
            )
    expected = 1 + threshold + sum((remainder + 1) // 2 for remainder in range(1, threshold + 1))
    assert len(rows) == expected
    return rows


def build_complete_refinement(
    rank: int,
    near: int,
    threshold: int,
    degree: int,
    split: int = 5,
) -> dict[str, object]:
    """Rebuild the original partition and prove every mixed cell by refinement."""

    assert threshold == 19 - near
    evaluate, source_terms = evaluator(rank)
    original_rows = []
    refinements = {"univariate": [], "bivariate": [], "trivariate": []}
    orbit_summary = {}

    for extension in EXTENSIONS:
        rows = original_partition(evaluate, extension, near, threshold, degree)
        for row in rows:
            row["extension"] = extension
        original_rows.extend(rows)
        obstructed = [row for row in rows if row["newton"]["negative"] > 0]
        by_dimension = {
            dimension: [row for row in obstructed if row["dimension"] == dimension]
            for dimension in (1, 2, 3)
        }
        assert {dimension: len(items) for dimension, items in by_dimension.items()} == {
            1: 10,
            2: 8,
            3: 1,
        }
        assert all(int(row["minimum_sampled_increment"]) > 0 for row in rows)
        assert all(int(row["newton"]["origin"]) > 0 for row in rows)

        for row in by_dimension[1]:
            tail, short, lower = row["shifts_tail_short_difference"]
            refinement = shifted_difference_ray(
                evaluate, extension, near, degree, tail, short, lower
            )
            refinements["univariate"].append(
                {
                    "extension": extension,
                    "original_cell_label": row["label"],
                    "original_ordered_sha256": row["newton"]["ordered_sha256"],
                    **refinement,
                }
            )

        for row in by_dimension[2]:
            tail, short_lower, difference_lower = row[
                "shifts_tail_short_difference"
            ]
            assert difference_lower == 0 and short_lower < split
            bulk = newton_cell(
                evaluate,
                extension,
                near,
                degree,
                (tail, split, 0),
                (1, 2),
            )
            assert bulk["newton"]["negative"] == 0
            assert int(bulk["newton"]["origin"]) > 0
            assert int(bulk["minimum_sampled_increment"]) > 0
            strips = [
                shifted_difference_ray(
                    evaluate, extension, near, degree, tail, short, 0
                )
                for short in range(short_lower, split)
            ]
            refinements["bivariate"].append(
                {
                    "extension": extension,
                    "original_cell_label": row["label"],
                    "original_ordered_sha256": row["newton"]["ordered_sha256"],
                    "tail": tail,
                    "original_short_lower": short_lower,
                    "split_short": split,
                    "partition": [
                        f"short>={split},difference>=0",
                        f"short={short_lower},...,{split - 1}; each difference ray split into a finite prefix and shifted Newton tail",
                    ],
                    "bulk": bulk,
                    "fixed_short_strips": strips,
                }
            )

        assert by_dimension[3][0]["label"] == f"tail>={threshold}"
        tri_rows = [
            {
                "extension": extension,
                "region": f"short>={split},difference>=0",
                **newton_cell(
                    evaluate,
                    extension,
                    near,
                    degree,
                    (threshold, split, 0),
                    (0, 1, 2),
                ),
            }
        ]
        for short in range(split):
            tri_rows.append(
                {
                    "extension": extension,
                    "region": f"short={short},difference>={split}",
                    **newton_cell(
                        evaluate,
                        extension,
                        near,
                        degree,
                        (threshold, short, split),
                        (0, 2),
                    ),
                }
            )
            for difference in range(split):
                tri_rows.append(
                    {
                        "extension": extension,
                        "region": f"short={short},difference={difference}",
                        **newton_cell(
                            evaluate,
                            extension,
                            near,
                            degree,
                            (threshold, short, difference),
                            (0,),
                        ),
                    }
                )
        assert len(tri_rows) == 1 + split + split * split
        assert all(row["newton"]["negative"] == 0 for row in tri_rows)
        assert all(int(row["newton"]["origin"]) > 0 for row in tri_rows)
        assert all(int(row["minimum_sampled_increment"]) > 0 for row in tri_rows)
        refinements["trivariate"].extend(tri_rows)

        passing = [row for row in rows if row["newton"]["negative"] == 0]
        orbit_summary[extension] = {
            "original_cells": len(rows),
            "original_coefficientwise_cells": len(passing),
            "original_obstructed_cells": len(obstructed),
            "obstructed_by_dimension": {
                str(key): len(value) for key, value in by_dimension.items()
            },
            "minimum_sampled_increment": str(
                min(int(row["minimum_sampled_increment"]) for row in rows)
            ),
        }
        print("ORIGINAL_AND_REFINED_PASS", extension, orbit_summary[extension], flush=True)

    shifted_rays = len(refinements["univariate"]) + sum(
        len(row["fixed_short_strips"]) for row in refinements["bivariate"]
    )
    literal_prefix_values = sum(
        row["finite_prefix_count"] for row in refinements["univariate"]
    ) + sum(
        strip["finite_prefix_count"]
        for row in refinements["bivariate"]
        for strip in row["fixed_short_strips"]
    )
    refined_tensor_rows = [row["bulk"] for row in refinements["bivariate"]]
    refined_tensor_rows += refinements["trivariate"]
    coverage_totals = {
        "extension_orbits": len(EXTENSIONS),
        "original_cells": len(original_rows),
        "original_coefficientwise_cells": sum(
            row["newton"]["negative"] == 0 for row in original_rows
        ),
        "original_obstructed_cells_replaced": sum(
            row["newton"]["negative"] > 0 for row in original_rows
        ),
        "original_newton_coefficients_profiled": sum(
            row["newton"]["coefficients"] for row in original_rows
        ),
        "univariate_refined_cells": len(refinements["univariate"]),
        "bivariate_refined_cells": len(refinements["bivariate"]),
        "bivariate_bulk_tensors": len(refinements["bivariate"]),
        "fixed_short_shifted_rays": shifted_rays - len(refinements["univariate"]),
        "trivariate_partition_regions": len(refinements["trivariate"]),
        "refined_tensor_coefficients": sum(
            row["newton"]["coefficients"] for row in refined_tensor_rows
        ),
        "shifted_rays": shifted_rays,
        "shifted_ray_newton_coefficients": shifted_rays * (degree + 1),
        "literal_finite_prefix_values": literal_prefix_values,
        "negative_coefficients_in_all_proving_regions": 0,
        "all_proving_region_origins_positive": True,
        "all_literal_prefix_values_positive": True,
    }
    return {
        "source_expression_terms": source_terms,
        "extensions": list(EXTENSIONS),
        "orbit_summary": orbit_summary,
        "coverage_totals": coverage_totals,
        "original_rows": original_rows,
        "refinements": refinements,
    }
