#!/usr/bin/env python3
"""Fail-closed seal for the independently executed literal i256 star audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e4_four_cubic_star_center_branch_all_order_exact_root_20260823.json"
RAW = ROOT / "rank8_delta03_e4_four_cubic_star_center_branch_literal_i256_raw_root_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_star_center_branch_all_order_independent_audit_root_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "audit_rank8_delta03_e4_four_cubic_star_center_branch_literal_i256_root.rs":
        "6170C39488AD745EDFD426F7205717731D2CF00A16B5FC9E261E65290298D4E0",
    "audit_rank8_delta03_e4_four_cubic_star_center_branch_literal_i256_root.exe":
        "EC9EF44A3D2938DC12EAA1526E963CD24C85978C9882672B2ADFA43FDE1B809E",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "scan_rank8_delta03_e4_four_cubic_star_center_branch_all_order_root.py":
        "E00FFECD36A97593936AE8F281282C50495212AB55A84BCECE44F3DBD8D43046",
    "rank8_delta03_e4_four_cubic_star_center_branch_all_order_exact_root_20260823.json":
        "0D9F29ACA9AD714C77841A91111A4542546E18190C6600EEBCA315EA8DC0508C",
    "rank8_delta03_e4_four_cubic_star_center_branch_literal_i256_raw_root_20260823.txt":
        "0EC1CA17FD4C3C2B6643150E99E1D44BEC2C8EBCEC3D378F7768F6ECAB3D195D",
    "certify_rank8_delta03_e4_four_cubic_star_center_branch_newton_reduction_root.py":
        "506896627104396D4B3F32005ACEFB5BB657881D02C23A7D36FDFA6C40473AFA",
    "rank8_delta03_e4_four_cubic_star_center_branch_newton_reduction_exact_root_20260823.json":
        "C9D3226634BE0292040BBB9A7B69AED1E32B33BA638295FECE04A5671855DAEE",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_CENTER_BRANCH_N27_PLUS"
    )
    assert primary["root_orbit"] == "four_cubic_star:center_branch"
    assert primary["quotient_counts"] == {
        "all_short_total": 540274,
        "all_short_n27_plus": 488801,
        "mixed_rays": 1358125,
        "all_long_rays": 1,
        "non_all_short_rays": 1358126,
    }

    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_LITERAL_I256_FOUR_CUBIC_STAR_CENTER_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {"COUNTS", "UNSEEN", "COEFFICIENT_STREAM", "FINITE_STREAM"}
    assert rows["COUNTS"] == "540274 488801 1358125 1 1358126"
    assert rows["UNSEEN"] == "5432504"
    assert rows["COEFFICIENT_STREAM"] == primary["coefficient_stream_sha256"]
    assert rows["FINITE_STREAM"] == primary["finite_value_stream_sha256"]

    payload = {
        "schema": "rank8-delta03-e4-four-cubic-star-center-branch-all-order-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_CENTER_BRANCH_N27_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine rebuilt every literal tree, deleted the center root, asserted literal/formula equality, matched both complete primary streams, and checked an unseen S=29 point on every rank-ray.",
        "counts": {
            "all_short_total": 540274,
            "all_short_n27_plus": 488801,
            "mixed_rays": 1358125,
            "all_long_rays": 1,
            "non_all_short_rays": 1358126,
            "literal_trees_evaluated": 488801 + 30 * 1358126,
            "unseen_S29_rank_checks": 5432504,
        },
        "matching_coefficient_stream_sha256": rows["COEFFICIENT_STREAM"],
        "matching_finite_value_stream_sha256": rows["FINITE_STREAM"],
        "arithmetic": "checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "compile_command": "rustc --target x86_64-pc-windows-gnu --edition=2021 -O -C overflow-checks=yes",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only four_cubic_star:center_branch.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", payload["counts"]["literal_trees_evaluated"], "UNSEEN", rows["UNSEEN"])
    print("STREAM", rows["COEFFICIENT_STREAM"], rows["FINITE_STREAM"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
