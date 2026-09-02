#!/usr/bin/env python3
"""Fail-closed seal for the independent literal checked-i256 outer audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e4_four_cubic_star_outer_branch_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e4_four_cubic_star_outer_branch_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_star_outer_branch_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json":
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "certify_rank8_delta03_e4_four_cubic_star_outer_branch_newton_reduction_agent.py":
        "CCADA47DBC5C1C09E979520C46C4BDBC4A5AA4AFFFDDB340CCECF17BDAF532B5",
    "rank8_delta03_e4_four_cubic_star_outer_branch_newton_reduction_exact_agent_20260823.json":
        "52C7C3ACD34C33E16DF94DEB00B144B3ECFCCDE0740E418DCBDED9B3DBEF8867",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "seal_rank8_delta03_e4_four_cubic_star_outer_branch_exact_agent.py":
        "344CF2FAE079EC20C4CAFA15677BD8E5132197A094CFB16F7E69287CA03127F5",
    "rank8_delta03_e4_four_cubic_star_outer_branch_all_order_exact_agent_20260823.json":
        "1A14F2C8C8FEF0C26D2AFF04CAE430CF433984EA20DB2A90337A1C08614FAED0",
    "audit_rank8_delta03_e4_four_cubic_star_outer_branch_literal_i256_agent.rs":
        "94442848792ECF8D37458649E6C6BC411E6B01D33337E3508ADF1533FACE5AF6",
    "audit_rank8_delta03_e4_four_cubic_star_outer_branch_literal_i256_agent.exe":
        "8853670A7609C7345A7F5ABD4D1ABFCFAA7ECF9C6FFC8B1BACD56DF6B6DB5494",
    "rank8_delta03_e4_four_cubic_star_outer_branch_literal_i256_raw_agent_20260823.txt":
        "C609FA58978BE6866B22ABE864148E3BD9E43E992AA27A453B8AB275E6EC01FF",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_OUTER_BRANCH_N27_PLUS"
    )
    assert primary["root_orbit"] == "four_cubic_star:outer_branch"
    assert primary["quotient_counts"] == {
        "all_short_total": 1_599_066,
        "all_short_n27_plus": 1_448_115,
        "mixed_rays": 4_045_733,
        "all_long_rays": 1,
        "non_all_short_rays": 4_045_734,
    }

    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_LITERAL_I256_FOUR_CUBIC_STAR_OUTER_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_TREES",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "1599066 1448115 4045733 1 4045734"
    assert rows["UNSEEN"] == "16182936"
    assert rows["LITERAL_TREES"] == "122820135"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == (
        primary["coefficient_merkle_stream_sha256"]
    )
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]

    payload = {
        "schema": (
            "rank8-delta03-e4-four-cubic-star-outer-branch-all-order-"
            "independent-audit-agent-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_"
            "OUTER_BRANCH_N27_PLUS_AUDIT"
        ),
        "audit_claim": (
            "A separately compiled checked-i256 engine rebuilt every literal "
            "tree as an adjacency list, deleted the outer cubic root, recomputed "
            "both forests by generic tree DP without calling the producer formula, "
            "matched both complete producer Merkle streams, and checked an unseen "
            "S=29 point on every rank-ray."
        ),
        "counts": {
            "all_short_total": 1_599_066,
            "all_short_n27_plus": 1_448_115,
            "mixed_rays": 4_045_733,
            "all_long_rays": 1,
            "non_all_short_rays": 4_045_734,
            "literal_trees_evaluated": 122_820_135,
            "unseen_S29_rank_checks": 16_182_936,
        },
        "matching_coefficient_merkle_stream_sha256": rows[
            "COEFFICIENT_MERKLE_STREAM"
        ],
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
        "scope_guard": "Audit credits only four_cubic_star:outer_branch.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", payload["counts"]["literal_trees_evaluated"])
    print("UNSEEN", payload["counts"]["unseen_S29_rank_checks"])
    print(
        "STREAM",
        payload["matching_coefficient_merkle_stream_sha256"],
        payload["matching_finite_merkle_stream_sha256"],
    )
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
