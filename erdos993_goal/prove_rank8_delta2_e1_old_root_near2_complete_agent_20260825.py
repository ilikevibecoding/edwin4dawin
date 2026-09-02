#!/usr/bin/env python3
"""Exact all-order Delta2 e=1 old-root theorem producer for near=2."""

from __future__ import annotations

import json
import os
from pathlib import Path

from rank8_e1_old_root_refinement_machinery_agent_20260825 import (
    build_complete_refinement,
    sha256,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_e1_old_root_near2_complete_exact_agent_20260825.json"
PROFILE = HERE / "rank8_delta23_e1_old_root_near2_profile_exact_agent_20260825.json"
RANK = 2
NEAR = 2
THRESHOLD = 17
DEGREE = 27
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
    "probe_rank8_delta23_e1_old_root_near2_profile_agent_20260825.py":
        "76212A9D7E32F5E87B966AA82C5C66BE6A0D5450FCBEBB535B4386BCA1519186",
    "rank8_delta23_e1_old_root_near2_profile_exact_agent_20260825.json":
        "3D1412EEDCDB356B17328FEA59357816B8ADAACFF240EA592869690B492ADC8F",
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
        "tail+2*short+difference>=17"
    )
    rank_profiles = [row for row in profile["profiles"] if row["rank"] == RANK]
    assert len(rank_profiles) == 3
    assert {row["extension"] for row in rank_profiles} == {"root", "short", "long"}
    for row in rank_profiles:
        assert row["cells"] == 99
        assert row["coefficientwise_cells"] == 80
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
    assert totals["original_cells"] == 297
    assert totals["original_coefficientwise_cells"] == 240
    assert totals["original_obstructed_cells_replaced"] == 57
    assert totals["original_newton_coefficients_profiled"] == 112644
    assert totals["univariate_refined_cells"] == 30
    assert totals["bivariate_refined_cells"] == 24
    assert totals["fixed_short_shifted_rays"] == 60
    assert totals["trivariate_partition_regions"] == 93
    assert totals["refined_tensor_coefficients"] == 98532
    assert totals["shifted_rays"] == 90
    assert totals["shifted_ray_newton_coefficients"] == 2520
    assert totals["negative_coefficients_in_all_proving_regions"] == 0

    payload = {
        "schema": "rank8-delta2-e1-old-root-near2-complete-agent-v1",
        "status": "PASS_EXACT_DELTA2_E1_OLD_ROOT_NEAR2_ALL_ORDER_ALL_EXTENSIONS",
        "theorem": (
            "Let T be a subdivided claw of source order at least 23.  Root T at "
            "the third vertex of any arm (two intervening vertices between the "
            "center and root), and extend any arm by one leaf.  Then the Delta2 "
            "coefficient of the rank-eight terminal residual at the old root "
            "increases strictly."
        ),
        "rank": RANK,
        "near": NEAR,
        "source_order_lower": 23,
        "source_order_condition": "tail+2*short+difference>=17",
        "degree_bound_each_active_axis": DEGREE,
        "split": SPLIT,
        "original_partition": [
            "tail>=17",
            "fixed tail<17 and short>=ceil((17-tail)/2)",
            "fixed smaller tail,short and difference>=17-tail-2*short",
        ],
        "refinement_rules": {
            "univariate": "finite positive prefix plus shifted nonnegative Newton tail",
            "bivariate": [
                "short>=5,difference>=0",
                "each fixed short below 5 split into a finite prefix and shifted difference tail",
            ],
            "trivariate_tail17": [
                "short>=5,difference>=0",
                "short=0..4,difference>=5",
                "short=0..4,difference=0..4",
            ],
        },
        **exact,
        "dependency_sha256": actual_hashes,
        "proof_boundary": (
            "This closes Delta2 only for the e=1 subdivided-claw old-root orbit "
            "with near=2.  Other near values, arbitrary trees, the general "
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
