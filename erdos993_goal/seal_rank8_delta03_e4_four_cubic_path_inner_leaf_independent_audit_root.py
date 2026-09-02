#!/usr/bin/env python3
"""Fail-closed seal for the independent path inner-leaf i256 audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e4_four_cubic_path_inner_leaf_all_order_exact_root_20260823.json"
RAW = ROOT / "rank8_delta03_e4_four_cubic_path_inner_leaf_literal_i256_raw_root_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_inner_leaf_all_order_independent_audit_root_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "audit_rank8_delta03_e4_four_cubic_path_inner_leaf_literal_i256_root.rs":
        "F2EBE20662F6DFEE3DDB65A4472436C6E7FE39E931D74EE8F8DBA7C355A03D8C",
    "audit_rank8_delta03_e4_four_cubic_path_inner_leaf_literal_i256_root.exe":
        "68648A9C3E0DB2D646B5A19D85ED9D49DC38B7989484956D55206CBFB4E399D3",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "seal_rank8_delta03_e4_four_cubic_path_inner_leaf_exact_root.py":
        "CFE64D770D8215D715E637E89B6B94FE50CD5D33A462FDF121F4B2563631B7BF",
    "rank8_delta03_e4_four_cubic_path_inner_leaf_all_order_exact_root_20260823.json":
        "249ADD9F09306572B43E7CEDA3AF2256EC2B5865498F3D8E762A6E479D4ABE19",
    "rank8_delta03_e4_four_cubic_path_inner_leaf_literal_i256_raw_root_20260823.txt":
        "ACC10E6E7CD0C841427FE46D64814B50AF3170EF08F632502F960CF517FC8033",
    "certify_rank8_delta03_e4_four_cubic_path_inner_leaf_newton_reduction_root.py":
        "9A91F7DDCFB30D1D54BD47346C62CE7C2242F0A47C84F11A11E1AC7326FF9405",
    "rank8_delta03_e4_four_cubic_path_inner_leaf_newton_reduction_exact_root_20260823.json":
        "C57C21ADDB6672CC97A040B6C173A2292BE0BF514D2A0BB1F94E4DFAD66BE61D",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_INNER_LEAF_N27_PLUS"
    )
    assert primary["root_orbit"] == "four_cubic_path:inner_leaf"
    assert primary["quotient_counts"] == {
        "all_short_total": 5_445_468,
        "all_short_n27_plus": 4_950_075,
        "mixed_rays": 14_223_523,
        "all_long_rays": 1,
        "non_all_short_rays": 14_223_524,
    }

    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_LITERAL_I256_FOUR_CUBIC_PATH_INNER_LEAF"
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
        "schema": "rank8-delta03-e4-four-cubic-path-inner-leaf-all-order-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_INNER_LEAF_N27_PLUS_AUDIT",
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
        "scope_guard": "Audit credits only four_cubic_path:inner_leaf.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", rows["LITERAL_TREES"], "UNSEEN", rows["UNSEEN"])
    print("STREAM", rows["COEFFICIENT_MERKLE_STREAM"], rows["FINITE_MERKLE_STREAM"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
