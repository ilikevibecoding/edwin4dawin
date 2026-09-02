#!/usr/bin/env python3
"""Fail-closed seal for the resumable checked-i256 inner-pendant producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MERGE = (
    ROOT
    / "rank8_delta03_e4_queued_prefix_shards_agent_20260823"
    / "four_cubic_path__inner_pendant_internal"
    / "four_cubic_path__inner_pendant_internal_complete_ordered_merge_exact_agent_20260823.json"
)
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json":
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "certify_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_newton_reduction_agent.py":
        "E3CAC8047E8B34EABA6E413AB27CADEC81F59444388DF7F831142FF3FBA7CE98",
    "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_newton_reduction_exact_agent_20260823.json":
        "17376D1C39B029B60BDA8551452DDBC3F01D82C8FAB22A409DE376AA522B2701",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_agent.rs":
        "583669652F2185B44807A52825D3E281B540FE8981222406025012A55A4487D8",
    "run_rank8_delta03_e4_queued_prefix_shards_agent.py":
        "4917DC4D9100B51F12971DA0FC44C384358FB7C423B71123DAB4F2280A3E1BA4",
}
EXPECTED_MERGE_SHA256 = "65961301B07544924355EA402BF9F30A57BF6DE85F68227AFD959835AB9339AA"


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    assert not EXPECTED_MERGE_SHA256.startswith("FILL_")
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    assert sha256(MERGE) == EXPECTED_MERGE_SHA256
    merge = json.loads(MERGE.read_text(encoding="utf-8"))
    assert merge["schema"] == "rank8-delta03-e4-exact-ordered-prefix-shard-merge-agent-v1"
    assert merge["status"] == "PASS_EXACT_COMPLETE_ORDERED_PREFIX_SHARD_MERGE"
    assert merge["orbit"] == "four_cubic_path:inner_pendant_internal"
    assert merge["coverage"] == [0, 12_544]
    assert merge["secondary_total"] == 12_544
    assert merge["counts"] == [38_118_276, 37_143_771, 119_233_659, 1, 119_233_660]
    assert merge["unseen_rank_checks"] == 476_934_640
    assert merge["runner_source_sha256"] == EXPECTED[
        "run_rank8_delta03_e4_queued_prefix_shards_agent.py"
    ]
    assert len(merge["ordered_shard_manifests"]) == 1_046
    literal_checks = 0
    for item in merge["ordered_shard_manifests"]:
        manifest = MERGE.parent / item["file"]
        assert sha256(manifest) == item["sha256"]
        literal_checks += json.loads(manifest.read_text(encoding="utf-8"))[
            "literal_spot_checks"
        ]
    for field in ("coefficient_stream_sha256", "finite_stream_sha256"):
        assert len(merge[field]) == 64
        int(merge[field], 16)
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-inner-pendant-internal-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_INNER_PENDANT_INTERNAL_N27_PLUS",
        "theorem": (
            "For a root internal to an inner pendant arm in every four-cubic-path "
            "e=4 subdivision and every n>=27, Delta0 through Delta3 are strictly positive."
        ),
        "root_orbit": "four_cubic_path:inner_pendant_internal",
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
            "d0>0,d1>0,d2..d_degree>=0 and coefficients above the exact degree "
            "vanish, with a checked unseen S=29 equality on every rank-ray"
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
            "The exact prefix intervals cover [0,12544) once in canonical order. "
            "Exactly four_cubic_path:inner_pendant_internal is credited; this does not credit "
            "any other open e=4 orbit, e>=5, forests, or the full conjecture."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["quotient_counts"]["all_short_n27_plus"])
    print("RAYS", payload["quotient_counts"]["non_all_short_rays"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
