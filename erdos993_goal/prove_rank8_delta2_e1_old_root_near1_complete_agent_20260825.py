#!/usr/bin/env python3
"""Complete exact Delta2 e=1 old-root proof for the near=1 orbit.

The original ordered-arm Newton partition has 109 cells per extension orbit.
Ninety certify immediately.  Each of the nineteen mixed-basis cells is
replaced by a no-gap refinement into finite positive prefixes and shifted
Newton orthants with nonnegative exact integer coefficients.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import numpy as np

from certify_rank8_e1_new_leaf_newton_cell import (
    difference_coefficients,
    evaluator,
    transform_axis,
)
from certify_rank8_e1_old_root_increment_ordered_near_cell import increment_value


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_e1_old_root_near1_complete_exact_agent_20260825.json"
RANK = 2
NEAR = 1
THRESHOLD = 18
DEGREE = 27
EXTENSIONS = ("root", "short", "long")
COORDINATES = ("tail", "short", "difference")
PINNED = {
    "certify_rank8_e1_new_leaf_newton_cell.py":
        "2FE6FD3C9CE46F46795238903D8264FD42629A5DCEA9F0CCB1A4D576C72DB218",
    "certify_rank8_e1_old_root_increment_ordered_near_cell.py":
        "EFD0D13515248BC9F9FDC88969A1DA2C8306D15F4F5DC53F27728CDDC3F8ED2D",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
    "probe_rank8_delta23_e1_old_root_near1_profile_agent_20260825.py":
        "CEF8FCFA0E5B8F8117A55FB50780A5F802A4993A8516CAD5B4987D24D708540E",
    "rank8_delta23_e1_old_root_near1_profile_exact_agent_20260825.json":
        "D4E2D83701881E723D799E9592094ADA6EB97DF8AB4E5E4D5EC85DBEBC24AA12",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


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
    shifts: tuple[int, int, int],
    active: tuple[int, ...],
) -> dict[str, object]:
    shape = (DEGREE + 1,) * len(active)
    values = np.empty(shape, dtype=object)
    for index in np.ndindex(shape):
        parameters = list(shifts)
        for axis, coordinate in enumerate(active):
            parameters[coordinate] += index[axis]
        values[index] = increment_value(evaluate, extension, NEAR, *parameters)
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
    tail: int,
    short: int,
    lower: int,
) -> dict[str, object]:
    def value(difference: int) -> int:
        return increment_value(evaluate, extension, NEAR, tail, short, difference)

    shift = lower
    while True:
        samples = [value(shift + offset) for offset in range(DEGREE + 1)]
        coefficients = difference_coefficients(samples)
        if min(coefficients) >= 0 and coefficients[0] > 0:
            break
        shift += 1
        assert shift <= lower + 100, (extension, tail, short, lower)
    prefix = [value(difference) for difference in range(lower, shift)]
    assert all(entry > 0 for entry in prefix)
    return {
        "tail": tail,
        "short": short,
        "original_difference_lower": lower,
        "tail_difference_lower": shift,
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
            f"difference={lower},...,{shift - 1} pointwise and difference>={shift} "
            f"by the binomial(difference-{shift},j) expansion"
        ),
    }


def original_partition(evaluate, extension: str) -> list[dict[str, object]]:
    rows = [
        {
            "label": f"tail>={THRESHOLD}",
            "dimension": 3,
            **newton_cell(evaluate, extension, (THRESHOLD, 0, 0), (0, 1, 2)),
        }
    ]
    for tail in range(THRESHOLD):
        remainder = THRESHOLD - tail
        short_lower = (remainder + 1) // 2
        rows.append(
            {
                "label": f"tail={tail}, short>=ceil({remainder}/2)={short_lower}",
                "dimension": 2,
                **newton_cell(evaluate, extension, (tail, short_lower, 0), (1, 2)),
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
                        (tail, short, difference_lower),
                        (2,),
                    ),
                }
            )
    assert len(rows) == 109
    return rows


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    route = json.loads(
        (HERE / "rank8_delta23_e1_old_root_near1_profile_exact_agent_20260825.json")
        .read_text(encoding="utf-8")
    )
    assert route["status"] == "EXACT_ROUTING_PROFILE_NO_THEOREM_CLAIM"
    evaluate, source_terms = evaluator(RANK)

    original_rows = []
    refinements = {"univariate": [], "bivariate": [], "trivariate": []}
    orbit_summary = {}
    for extension in EXTENSIONS:
        rows = original_partition(evaluate, extension)
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
                evaluate, extension, tail, short, lower
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
            assert difference_lower == 0 and short_lower < 5
            bulk = newton_cell(evaluate, extension, (tail, 5, 0), (1, 2))
            assert bulk["newton"]["negative"] == 0
            assert int(bulk["newton"]["origin"]) > 0
            assert int(bulk["minimum_sampled_increment"]) > 0
            strips = [
                shifted_difference_ray(evaluate, extension, tail, short, 0)
                for short in range(short_lower, 5)
            ]
            refinements["bivariate"].append(
                {
                    "extension": extension,
                    "original_cell_label": row["label"],
                    "original_ordered_sha256": row["newton"]["ordered_sha256"],
                    "tail": tail,
                    "original_short_lower": short_lower,
                    "partition": [
                        "short>=5,difference>=0",
                        f"short={short_lower},...,4; each difference ray split into a finite prefix and shifted Newton tail",
                    ],
                    "bulk_short5": bulk,
                    "fixed_short_strips": strips,
                }
            )

        assert by_dimension[3][0]["label"] == f"tail>={THRESHOLD}"
        tri_rows = [
            {
                "extension": extension,
                "region": "short>=5,difference>=0",
                **newton_cell(evaluate, extension, (THRESHOLD, 5, 0), (0, 1, 2)),
            }
        ]
        for short in range(5):
            tri_rows.append(
                {
                    "extension": extension,
                    "region": f"short={short},difference>=5",
                    **newton_cell(
                        evaluate, extension, (THRESHOLD, short, 5), (0, 2)
                    ),
                }
            )
            for difference in range(5):
                tri_rows.append(
                    {
                        "extension": extension,
                        "region": f"short={short},difference={difference}",
                        **newton_cell(
                            evaluate,
                            extension,
                            (THRESHOLD, short, difference),
                            (0,),
                        ),
                    }
                )
        assert len(tri_rows) == 31
        assert all(row["newton"]["negative"] == 0 for row in tri_rows)
        assert all(int(row["newton"]["origin"]) > 0 for row in tri_rows)
        assert all(int(row["minimum_sampled_increment"]) > 0 for row in tri_rows)
        refinements["trivariate"].extend(tri_rows)

        passing = [row for row in rows if row["newton"]["negative"] == 0]
        orbit_summary[extension] = {
            "original_cells": len(rows),
            "original_coefficientwise_cells": len(passing),
            "original_obstructed_cells": len(obstructed),
            "obstructed_by_dimension": {str(key): len(value) for key, value in by_dimension.items()},
            "minimum_sampled_increment": str(
                min(int(row["minimum_sampled_increment"]) for row in rows)
            ),
        }
        print("ORIGINAL_AND_REFINED_PASS", extension, orbit_summary[extension], flush=True)

    assert len(original_rows) == 327
    assert len(refinements["univariate"]) == 30
    assert len(refinements["bivariate"]) == 24
    assert len(refinements["trivariate"]) == 93
    assert all(
        row["tail_negative"] == 0 and int(row["tail_origin"]) > 0
        for row in refinements["univariate"]
    )
    assert all(
        strip["tail_negative"] == 0 and int(strip["tail_origin"]) > 0
        for row in refinements["bivariate"]
        for strip in row["fixed_short_strips"]
    )

    original_coefficients = sum(
        row["newton"]["coefficients"] for row in original_rows
    )
    refined_tensor_rows = [
        row["bulk_short5"] for row in refinements["bivariate"]
    ] + refinements["trivariate"]
    refined_tensor_coefficients = sum(
        row["newton"]["coefficients"] for row in refined_tensor_rows
    )
    literal_prefix_values = sum(
        row["finite_prefix_count"] for row in refinements["univariate"]
    ) + sum(
        strip["finite_prefix_count"]
        for row in refinements["bivariate"]
        for strip in row["fixed_short_strips"]
    )
    shifted_ray_coefficients = DEGREE + 1
    shifted_rays = len(refinements["univariate"]) + sum(
        len(row["fixed_short_strips"]) for row in refinements["bivariate"]
    )

    payload = {
        "schema": "rank8-delta2-e1-old-root-near1-complete-agent-v1",
        "status": "PASS_EXACT_DELTA2_E1_OLD_ROOT_NEAR1_ALL_ORDER_ALL_EXTENSIONS",
        "theorem": (
            "Let T be a subdivided claw of source order at least 23.  Root T at "
            "the second vertex of any arm (one intervening vertex between the "
            "center and root), and extend any arm by one leaf.  Then the Delta2 "
            "coefficient of the rank-eight terminal residual at the old root "
            "increases strictly."
        ),
        "rank": RANK,
        "near": NEAR,
        "source_order_lower": 23,
        "source_order_condition": "tail+2*short+difference>=18",
        "degree_bound_each_active_axis": DEGREE,
        "source_expression_terms": source_terms,
        "extensions": list(EXTENSIONS),
        "original_partition": [
            "tail>=18",
            "fixed tail<18 and short>=ceil((18-tail)/2)",
            "fixed smaller tail,short and difference>=18-tail-2*short",
        ],
        "refinement_rules": {
            "univariate": "finite positive prefix plus shifted nonnegative Newton tail",
            "bivariate": [
                "short>=5,difference>=0",
                "each fixed short below 5 split into a finite prefix and shifted difference tail",
            ],
            "trivariate_tail18": [
                "short>=5,difference>=0",
                "short=0..4,difference>=5",
                "short=0..4,difference=0..4",
            ],
        },
        "orbit_summary": orbit_summary,
        "coverage_totals": {
            "extension_orbits": 3,
            "original_cells": len(original_rows),
            "original_coefficientwise_cells": sum(
                row["newton"]["negative"] == 0 for row in original_rows
            ),
            "original_obstructed_cells_replaced": sum(
                row["newton"]["negative"] > 0 for row in original_rows
            ),
            "original_newton_coefficients_profiled": original_coefficients,
            "univariate_refined_cells": len(refinements["univariate"]),
            "bivariate_refined_cells": len(refinements["bivariate"]),
            "bivariate_bulk_tensors": len(refinements["bivariate"]),
            "fixed_short_shifted_rays": shifted_rays - len(refinements["univariate"]),
            "trivariate_partition_regions": len(refinements["trivariate"]),
            "refined_tensor_coefficients": refined_tensor_coefficients,
            "shifted_rays": shifted_rays,
            "shifted_ray_newton_coefficients": shifted_rays * shifted_ray_coefficients,
            "literal_finite_prefix_values": literal_prefix_values,
            "negative_coefficients_in_all_proving_regions": 0,
            "all_proving_region_origins_positive": True,
            "all_literal_prefix_values_positive": True,
        },
        "original_rows": original_rows,
        "refinements": refinements,
        "dependency_sha256": actual_hashes,
        "proof_boundary": (
            "This closes Delta2 only for the e=1 subdivided-claw old-root orbit "
            "with near=1.  Other near values, arbitrary trees, the general "
            "Delta2/3 inserted-leaf gates, full Q8/PGC, forest unimodality, and "
            "Erdos Problem 993 remain outside this theorem."
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
