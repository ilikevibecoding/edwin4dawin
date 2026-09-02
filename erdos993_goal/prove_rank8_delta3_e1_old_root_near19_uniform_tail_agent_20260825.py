#!/usr/bin/env python3
"""Exact theorem producer for the uniform Delta3 old-root tail near>=19."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
PROFILE = HERE / "rank8_delta3_e1_old_root_near19_uniform_tail_profile_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta3_e1_old_root_near19_uniform_tail_exact_agent_20260825.json"
PINNED = {
    "probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "682830D92266857D64440BA3591C275D2CF6D47E6534F853F3BF2282451BA2C5",
    "rank8_delta3_e1_old_root_near19_uniform_tail_profile_exact_agent_20260825.json":
        "65B14D169B3A0C54225DA272473CFE7E3AC93152AC4B0EFBA5CCD21E932EC3B5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    assert profile["status"] == "PASS_EXACT_UNIFORM_TAIL_PROFILE_NO_THEOREM_CLAIM"
    assert profile["degree_bound_each_active_axis"] == 26
    assert profile["partition"] == {
        "near": "near>=19 in every region",
        "tail": "tail>=6 or tail=0..5",
        "short_difference": (
            "short>=6,difference>=0; or short=s in 0..5 with "
            "difference>=6-s or difference=0..5-s"
        ),
        "disjoint_exhaustive": True,
        "regions_per_extension": 196,
        "regions_by_dimension": {"1": 126, "2": 57, "3": 12, "4": 1},
        "coefficients_per_extension": 812592,
    }
    assert [entry["extension"] for entry in profile["profiles"]] == [
        "root",
        "short",
        "long",
    ]
    orbit_summary = {}
    for entry in profile["profiles"]:
        totals = entry["totals"]
        assert totals["regions"] == 196
        assert totals["regions_by_dimension"] == {"1": 126, "2": 57, "3": 12, "4": 1}
        assert totals["coefficients"] == 812592
        assert totals["negative"] == 0
        assert totals["positive"] == 77250
        assert totals["zero"] == 735342
        assert int(totals["minimum_sampled_increment"]) > 0
        assert int(totals["minimum_origin"]) > 0
        assert totals["minimum_coefficient"] == "0"
        assert len(entry["rows"]) == 196
        assert all(row["negative"] == 0 for row in entry["rows"])
        assert all(int(row["origin"]) > 0 for row in entry["rows"])
        assert all(int(row["minimum_sampled_increment"]) > 0 for row in entry["rows"])
        orbit_summary[entry["extension"]] = totals

    payload = {
        "schema": "rank8-delta3-e1-old-root-near19-uniform-tail-agent-v1",
        "status": "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR19_PLUS_ALL_EXTENSIONS",
        "theorem": (
            "Let T be a subdivided claw of order at least 23, rooted on an arm "
            "with at least nineteen intervening vertices between the center and "
            "root (near>=19).  Extending any arm by one leaf strictly increases "
            "the Delta3 coefficient of the rank-eight terminal residual at the "
            "old root."
        ),
        "rank": 3,
        "near_lower": 19,
        "source_order_lower": 23,
        "source_order_automatic": True,
        "extensions": ["root", "short", "long"],
        "degree_bound_each_active_axis": 26,
        "path_transfer": profile["path_transfer"],
        "stable_branch_reason": profile["stable_branch_reason"],
        "degree_bound_reason": profile["degree_bound_reason"],
        "partition": profile["partition"],
        "orbit_summary": orbit_summary,
        "coverage_totals": {
            "extension_orbits": 3,
            "regions": 588,
            "regions_by_dimension": {"1": 378, "2": 171, "3": 36, "4": 3},
            "newton_coefficients": 2437776,
            "negative_coefficients": 0,
            "zero_coefficients": 2206026,
            "positive_coefficients": 231750,
            "all_origins_positive": True,
            "all_sampled_increments_positive": True,
        },
        "profile_dependency_sha256": actual,
        "proof_boundary": (
            "This certificate covers only Delta3 e=1 subdivided-claw old-root "
            "arm-extension increments with near>=19.  It does not cover near=5..18, "
            "other root families, arbitrary trees, inserted-new-leaf gates, full "
            "Q8/PGC, forest unimodality, or Erdos Problem 993."
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
