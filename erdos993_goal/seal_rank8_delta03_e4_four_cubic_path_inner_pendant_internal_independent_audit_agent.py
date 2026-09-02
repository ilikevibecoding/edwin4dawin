#!/usr/bin/env python3
"""Fail-closed seal for the independent inner-pendant-internal literal audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_all_order_independent_audit_agent_20260823.json"
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
    "seal_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_exact_agent.py":
        "8127EEEB0973841B2A9877EF89551571A6998071744FAED058C80EFA431615B5",
    "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_all_order_exact_agent_20260823.json":
        "E12D235CDEA876997D0D2230EE59E80946CFAE7BE6022718167C7ECAD02FFFC1",
    "audit_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_literal_i256_agent.rs":
        "E47F0E7451B69F39BAFED3AF7761CB0F02FDCE5303C0249CBFAF410DAF0A02F2",
    "audit_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_literal_i256_agent.exe":
        "696D60F4B9D1BDD1972B114664E4B24ECEEBB887DF981F70C10F640D37C30832",
    "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_literal_i256_raw_agent_20260823.txt":
        "6E8CE066A86CFF616636B8625E4F5C9D7263699299A9C53BFA25DDFB3EE6E675",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_INNER_PENDANT_INTERNAL_N27_PLUS"
    )
    assert primary["root_orbit"] == "four_cubic_path:inner_pendant_internal"
    assert primary["quotient_counts"] == {
        "all_short_total": 38_118_276,
        "all_short_n27_plus": 37_143_771,
        "mixed_rays": 119_233_659,
        "all_long_rays": 1,
        "non_all_short_rays": 119_233_660,
    }
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_PATH_INNER_PENDANT_INTERNAL"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_TREES", "LITERAL_RAY_POINTS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "38118276 37143771 119233659 1 119233660"
    assert rows["UNSEEN"] == "476934640"
    assert rows["LITERAL_TREES"] == "394844751"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-inner-pendant-internal-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_INNER_PENDANT_INTERNAL_N27_PLUS_AUDIT",
        "audit_claim": (
            "A separately compiled checked-i256 engine independently enumerated "
            "every key, propagated full and root-deleted states from the selected "
            "root and left outer cubic into B1 and then forward through B2--B3 "
            "rather than using the producer's root-centered left/right combination, "
            "matched every finite record and complete 29-coefficient row, and "
            "rebuilt every eligible finite tree plus S=0,S=13,S=29 on every ray "
            "as an expanded adjacency-list tree evaluated by generic forest DP."
        ),
        "counts": {
            "all_short_total": 38_118_276,
            "all_short_n27_plus": 37_143_771,
            "mixed_rays": 119_233_659,
            "all_long_rays": 1,
            "non_all_short_rays": 119_233_660,
            "literal_trees_evaluated": 394_844_751,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 476_934_640,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": (
            "six-thread checked signed i256 residual/Newton arithmetic and checked "
            "i128 independence-vector arithmetic"
        ),
        "compile_command": (
            "rustc --target x86_64-pc-windows-gnu --edition=2021 -O "
            "-C overflow-checks=yes"
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only four_cubic_path:inner_pendant_internal.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", payload["counts"]["literal_trees_evaluated"])
    print("UNSEEN", payload["counts"]["unseen_S29_rank_checks"])
    print("STREAM", payload["matching_coefficient_merkle_stream_sha256"], payload["matching_finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
