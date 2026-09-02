#!/usr/bin/env python3
"""Fail-closed seal for the independent path outer-leaf i256 audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e4_four_cubic_path_outer_leaf_all_order_exact_root_20260823.json"
RAW = ROOT / "rank8_delta03_e4_four_cubic_path_outer_leaf_literal_i256_raw_root_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_outer_leaf_all_order_independent_audit_root_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "audit_rank8_delta03_e4_four_cubic_path_outer_leaf_literal_i256_root.rs":
        "566D875DFBF0F38040F50C3C34AFF1C2FB1BF720021E6D54FC27114DBEC277A7",
    "audit_rank8_delta03_e4_four_cubic_path_outer_leaf_literal_i256_root.exe":
        "C10BF9DD984D734FB383A9B9F0C403B1E7B43C78306D82F52E04A91230B46D9A",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "seal_rank8_delta03_e4_four_cubic_path_outer_leaf_exact_root.py":
        "2A999748C3B8B213E5BC32CFC770AED354F789AF904B0C2E23DD17E1A0E3D9CD",
    "rank8_delta03_e4_four_cubic_path_outer_leaf_all_order_exact_root_20260823.json":
        "E8DCF126732F2851384B843B1EEDA8CEE522CCC649C43A34ED5065EEB5E54512",
    "rank8_delta03_e4_four_cubic_path_outer_leaf_literal_i256_raw_root_20260823.txt":
        "3C4F02E477A258B0CF312C0595F0B5F225281B0861799E0BE6C319379DB161FD",
    "certify_rank8_delta03_e4_four_cubic_path_outer_leaf_newton_reduction_root.py":
        "FD99FDE50341A640CB198813F05A41429C64FF9E6CE782C1C8857A20292ED9A4",
    "rank8_delta03_e4_four_cubic_path_outer_leaf_newton_reduction_exact_root_20260823.json":
        "9D14282AB208AE7913BC93D330FB2F09978CEC16E486B62B59034E967D2BC772",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_OUTER_LEAF_N27_PLUS"
    )
    assert primary["root_orbit"] == "four_cubic_path:outer_leaf"
    assert primary["quotient_counts"] == {
        "all_short_total": 9_335_088,
        "all_short_n27_plus": 8_514_223,
        "mixed_rays": 25_085_647,
        "all_long_rays": 1,
        "non_all_short_rays": 25_085_648,
    }

    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_LITERAL_I256_FOUR_CUBIC_PATH_OUTER_LEAF"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_TREES",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "9335088 8514223 25085647 1 25085648"
    assert rows["UNSEEN"] == "100342592"
    assert rows["LITERAL_TREES"] == "83771167"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]

    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-outer-leaf-all-order-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_OUTER_LEAF_N27_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine used independently transcribed right-to-left edge messages, matched both complete primary streams, rebuilt every finite tree, and rebuilt literal trees at S=0,13,29 on every ray.",
        "counts": {
            "all_short_total": 9_335_088,
            "all_short_n27_plus": 8_514_223,
            "mixed_rays": 25_085_647,
            "all_long_rays": 1,
            "non_all_short_rays": 25_085_648,
            "literal_trees_evaluated": 83_771_167,
            "unseen_S29_rank_checks": 100_342_592,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": "checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "compile_command": "rustc --target x86_64-pc-windows-gnu --edition=2021 -O -C overflow-checks=yes",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only four_cubic_path:outer_leaf.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", rows["LITERAL_TREES"], "UNSEEN", rows["UNSEEN"])
    print("STREAM", rows["COEFFICIENT_MERKLE_STREAM"], rows["FINITE_MERKLE_STREAM"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
