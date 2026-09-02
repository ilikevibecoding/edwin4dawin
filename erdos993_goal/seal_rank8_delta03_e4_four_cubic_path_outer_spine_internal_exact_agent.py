#!/usr/bin/env python3
"""Fail-closed seal for the resumable checked-i256 outer-spine producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MERGE = (
    ROOT
    / "rank8_delta03_e4_queued_prefix_shards_agent_20260823"
    / "four_cubic_path__outer_spine_internal"
    / "four_cubic_path__outer_spine_internal_complete_ordered_merge_exact_agent_20260823.json"
)
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_outer_spine_internal_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "certify_rank8_delta03_e4_four_cubic_path_outer_spine_internal_newton_reduction_agent.py": "0A76324F85DCFB2482B07F01344AD597376E44CBC5B41B61767A6F6E3ADC3598",
    "rank8_delta03_e4_four_cubic_path_outer_spine_internal_newton_reduction_exact_agent_20260823.json": "54A47725DDB2FB34A1946B9CB5DD9A62146D00460AE4F3B5BDF30B184B63A1D0",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_path_outer_spine_internal_i256_agent.rs": "DD15B8BB51B931BDCA7802C5CB0C9DE07CBB195264FDE8D812DCF1C952E7224E",
    "run_rank8_delta03_e4_queued_prefix_shards_agent.py": "4917DC4D9100B51F12971DA0FC44C384358FB7C423B71123DAB4F2280A3E1BA4",
}
EXPECTED_MERGE_SHA256 = "495978995168BB9F19226DF28B9E1CE82395F8DEB7A113CAB6BEBC61C0BB5581"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    assert not EXPECTED_MERGE_SHA256.startswith("FILL_")
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    assert sha256(MERGE) == EXPECTED_MERGE_SHA256
    merge = json.loads(MERGE.read_text(encoding="utf-8"))
    assert merge["schema"] == "rank8-delta03-e4-exact-ordered-prefix-shard-merge-agent-v1"
    assert merge["status"] == "PASS_EXACT_COMPLETE_ORDERED_PREFIX_SHARD_MERGE"
    assert merge["orbit"] == "four_cubic_path:outer_spine_internal"
    assert merge["coverage"] == [0, 1_792]
    assert merge["secondary_total"] == 87_808
    assert merge["counts"] == [38_118_276, 37_143_771, 119_233_659, 1, 119_233_660]
    assert merge["unseen_rank_checks"] == 476_934_640
    assert merge["runner_source_sha256"] == EXPECTED[
        "run_rank8_delta03_e4_queued_prefix_shards_agent.py"
    ]
    assert len(merge["ordered_shard_manifests"]) == 150
    literal_checks = 0
    for item in merge["ordered_shard_manifests"]:
        manifest = MERGE.parent / item["file"]
        assert sha256(manifest) == item["sha256"]
        literal_checks += json.loads(manifest.read_text(encoding="utf-8"))[
            "literal_spot_checks"
        ]
    for field in ("coefficient_stream_sha256", "finite_stream_sha256"):
        assert len(merge[field]) == 64 and int(merge[field], 16) >= 0
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-outer-spine-internal-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_OUTER_SPINE_INTERNAL_N27_PLUS",
        "theorem": (
            "For a root internal to an outer spine in every four-cubic-path e=4 "
            "subdivision and every n>=27, Delta0 through Delta3 are strictly positive."
        ),
        "root_orbit": "four_cubic_path:outer_spine_internal",
        "quotient_counts": {
            "all_short_total": 38_118_276,
            "all_short_n27_plus": 37_143_771,
            "mixed_rays": 119_233_659,
            "all_long_rays": 1,
            "non_all_short_rays": 119_233_660,
        },
        "rank_ray_samples": 119_233_660 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": (
            "d0>0,d1>0,d2..d_degree>=0 and exact zero tail, with checked unseen "
            "S=29 equality on every rank-ray"
        ),
        "unseen_S29_rank_checks": 476_934_640,
        "literal_formula_spot_checks": literal_checks,
        "coefficient_merkle_stream_sha256": merge["coefficient_stream_sha256"],
        "finite_merkle_stream_sha256": merge["finite_stream_sha256"],
        "arithmetic": (
            "six-thread checked signed i256 residual/Newton arithmetic and checked "
            "i128 independence-vector arithmetic"
        ),
        "immutable_input_hashes": {
            **actual,
            str(MERGE.relative_to(ROOT)): EXPECTED_MERGE_SHA256,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "The exact prefix intervals cover [0,1792) once in canonical order. "
            "Exactly four_cubic_path:outer_spine_internal is credited; no other open e=4 orbit, "
            "e>=5, forests, or full-conjecture credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", 37_143_771)
    print("RAYS", 119_233_660)
    print(
        "STREAM",
        payload["coefficient_merkle_stream_sha256"],
        payload["finite_merkle_stream_sha256"],
    )
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
