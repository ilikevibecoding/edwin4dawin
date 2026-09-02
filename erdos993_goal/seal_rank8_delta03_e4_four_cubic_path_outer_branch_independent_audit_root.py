#!/usr/bin/env python3
"""Fail-closed seal for the independent path outer-branch i256 audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e4_four_cubic_path_outer_branch_all_order_exact_root_20260823.json"
RAW = ROOT / "rank8_delta03_e4_four_cubic_path_outer_branch_literal_i256_raw_root_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_outer_branch_all_order_independent_audit_root_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "audit_rank8_delta03_e4_four_cubic_path_outer_branch_literal_i256_root.rs":
        "BB9FBFEB250EAA2237C256F661557D90D17D1B34090709929A367BF926079B5A",
    "audit_rank8_delta03_e4_four_cubic_path_outer_branch_literal_i256_root.exe":
        "FAD3E65600669466BBEDB6363524AD2A2646A2B1F6E1628349E01200360AEAB4",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "seal_rank8_delta03_e4_four_cubic_path_outer_branch_exact_root.py":
        "C05C8B15621DB1014E608762484AD48BEB0D3261A263ADC67CAED237263A61FC",
    "rank8_delta03_e4_four_cubic_path_outer_branch_all_order_exact_root_20260823.json":
        "47ED8AC5FB58A5FB32E1FF3F70F534F403AEDF0B14F09422666A64C42D671CA6",
    "rank8_delta03_e4_four_cubic_path_outer_branch_literal_i256_raw_root_20260823.txt":
        "1B437C0B8C62A6EBC9F58A1D916DBAE44D904EA822C81CBD2A51A44C05E407B1",
    "certify_rank8_delta03_e4_four_cubic_path_outer_branch_newton_reduction_root.py":
        "B3D7369413B6771E4660CD59DEDC2D86266E1829DF4C6CBEEB9A772E833A1367",
    "rank8_delta03_e4_four_cubic_path_outer_branch_newton_reduction_exact_root_20260823.json":
        "1EDEFB7C18566519B30F77AE7473C541A2CC86F75D4A02831610938AB879ACDC",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_OUTER_BRANCH_N27_PLUS"
    )
    assert primary["root_orbit"] == "four_cubic_path:outer_branch"
    assert primary["quotient_counts"] == {
        "all_short_total": 5_445_468,
        "all_short_n27_plus": 4_950_075,
        "mixed_rays": 14_223_523,
        "all_long_rays": 1,
        "non_all_short_rays": 14_223_524,
    }

    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_LITERAL_I256_FOUR_CUBIC_PATH_OUTER_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_TREES",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "5445468 4950075 14223523 1 14223524"
    assert rows["UNSEEN"] == "56894096"
    assert rows["LITERAL_TREES"] == "47620647"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]

    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-outer-branch-all-order-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_OUTER_BRANCH_N27_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine used independently transcribed right-to-left edge messages, matched both complete primary streams, rebuilt every finite tree, and rebuilt literal trees at S=0,13,29 on every ray.",
        "counts": {
            "all_short_total": 5_445_468,
            "all_short_n27_plus": 4_950_075,
            "mixed_rays": 14_223_523,
            "all_long_rays": 1,
            "non_all_short_rays": 14_223_524,
            "literal_trees_evaluated": 47_620_647,
            "unseen_S29_rank_checks": 56_894_096,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": "checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "compile_command": "rustc --target x86_64-pc-windows-gnu --edition=2021 -O -C overflow-checks=yes",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only four_cubic_path:outer_branch.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", rows["LITERAL_TREES"], "UNSEEN", rows["UNSEEN"])
    print("STREAM", rows["COEFFICIENT_MERKLE_STREAM"], rows["FINITE_MERKLE_STREAM"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
