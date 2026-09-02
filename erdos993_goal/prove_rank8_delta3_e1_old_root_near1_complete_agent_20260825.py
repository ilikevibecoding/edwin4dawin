#!/usr/bin/env python3
"""Exact all-order Delta3 e=1 old-root theorem producer for near=1."""

from __future__ import annotations

import json
import os
from pathlib import Path

from rank8_e1_old_root_refinement_machinery_agent_20260825 import (
    build_complete_refinement,
    sha256,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_old_root_near1_complete_exact_agent_20260825.json"
PROFILE = HERE / "rank8_delta23_e1_old_root_near1_profile_exact_agent_20260825.json"
RANK = 3
NEAR = 1
THRESHOLD = 18
DEGREE = 26
SPLIT = 5
PINNED = {
    "certify_rank8_e1_new_leaf_newton_cell.py":
        "2FE6FD3C9CE46F46795238903D8264FD42629A5DCEA9F0CCB1A4D576C72DB218",
    "certify_rank8_e1_old_root_increment_ordered_near_cell.py":
        "EFD0D13515248BC9F9FDC88969A1DA2C8306D15F4F5DC53F27728CDDC3F8ED2D",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
    "rank8_e1_old_root_refinement_machinery_agent_20260825.py":
        "2771F20D90E1F7BC6016FA20FA375548413BD3EB7B88454510C3919D254804AE",
    "probe_rank8_delta23_e1_old_root_near1_profile_agent_20260825.py":
        "CEF8FCFA0E5B8F8117A55FB50780A5F802A4993A8516CAD5B4987D24D708540E",
    "rank8_delta23_e1_old_root_near1_profile_exact_agent_20260825.json":
        "D4E2D83701881E723D799E9592094ADA6EB97DF8AB4E5E4D5EC85DBEBC24AA12",
}


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    assert profile["status"] == "EXACT_ROUTING_PROFILE_NO_THEOREM_CLAIM"
    assert profile["near"] == NEAR
    assert profile["source_order_condition"] == (
        "tail+2*short+difference>=18"
    )
    rank_profiles = [row for row in profile["profiles"] if row["rank"] == RANK]
    assert len(rank_profiles) == 3
    assert {row["extension"] for row in rank_profiles} == {"root", "short", "long"}
    for row in rank_profiles:
        assert row["cells"] == 109
        assert row["obstructed_cells"] == 19
        assert row["obstructed_by_dimension"] == {"1": 10, "2": 8, "3": 1}
        assert int(row["minimum_sampled_increment"]) > 0
        assert int(row["minimum_origin"]) > 0

    exact = build_complete_refinement(
        rank=RANK,
        near=NEAR,
        threshold=THRESHOLD,
        degree=DEGREE,
        split=SPLIT,
    )
    totals = exact["coverage_totals"]
    assert totals["original_cells"] == 327
    assert totals["original_coefficientwise_cells"] == 270
    assert totals["original_obstructed_cells_replaced"] == 57
    assert totals["original_newton_coefficients_profiled"] == 105705
    assert totals["univariate_refined_cells"] == 30
    assert totals["bivariate_refined_cells"] == 24
    assert totals["fixed_short_shifted_rays"] == 60
    assert totals["trivariate_partition_regions"] == 93
    assert totals["refined_tensor_coefficients"] == 89505
    assert totals["shifted_rays"] == 90
    assert totals["shifted_ray_newton_coefficients"] == 2430
    assert totals["negative_coefficients_in_all_proving_regions"] == 0

    payload = {
        "schema": "rank8-delta3-e1-old-root-near1-complete-agent-v1",
        "status": "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR1_ALL_ORDER_ALL_EXTENSIONS",
        "theorem": (
            "Let T be a subdivided claw of source order at least 23.  Root T at "
            "the second vertex of any arm (one intervening vertex between the "
            "center and root), and extend any arm by one leaf.  Then the Delta3 "
            "coefficient of the rank-eight terminal residual at the old root "
            "increases strictly."
        ),
        "rank": RANK,
        "near": NEAR,
        "source_order_lower": 23,
        "source_order_condition": "tail+2*short+difference>=18",
        "degree_bound_each_active_axis": DEGREE,
        "split": SPLIT,
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
        **exact,
        "dependency_sha256": actual_hashes,
        "proof_boundary": (
            "This closes Delta3 only for the e=1 subdivided-claw old-root orbit "
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
