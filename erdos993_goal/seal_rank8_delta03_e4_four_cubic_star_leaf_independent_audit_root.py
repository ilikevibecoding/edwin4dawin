#!/usr/bin/env python3
"""Fail-closed seal for the independent literal i256 leaf-orbit audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e4_four_cubic_star_leaf_all_order_exact_root_20260823.json"
RAW = ROOT / "rank8_delta03_e4_four_cubic_star_leaf_literal_i256_raw_root_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_star_leaf_all_order_independent_audit_root_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "audit_rank8_delta03_e4_four_cubic_star_leaf_literal_i256_root.rs":
        "3DEF731758AD23D4C143D658F356369349612F0673987E9349A23F2267F3B138",
    "audit_rank8_delta03_e4_four_cubic_star_leaf_literal_i256_root.exe":
        "E1DEF2D4F3DE70783181E514CD581EACA5F3975CFE9F68A0FEC84E538F93D9D7",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "seal_rank8_delta03_e4_four_cubic_star_leaf_exact_root.py":
        "C6ACB460AF6D0F34B26C720150C789D16242845FE5C7C6F8C34770E053027DB3",
    "rank8_delta03_e4_four_cubic_star_leaf_all_order_exact_root_20260823.json":
        "D68473512A37B79953BA452DF84931951E22872C57CEE0F4F983294E909CDC2B",
    "rank8_delta03_e4_four_cubic_star_leaf_literal_i256_raw_root_20260823.txt":
        "6F197A94F983D779C25289593365C05C7EEAD81B7DDE366D34E005970F275AC5",
    "certify_rank8_delta03_e4_four_cubic_star_leaf_newton_reduction_root.py":
        "76F9EF729173B929AD304388731A00E275E640CCA002C7B063C94CA8BA515E9D",
    "rank8_delta03_e4_four_cubic_star_leaf_newton_reduction_exact_root_20260823.json":
        "985070390050F9F77AD5C3CF6643F83405EB3B1EBDBAEE5CCFF03136101FB1D1",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_LEAF_N27_PLUS"
    )
    assert primary["root_orbit"] == "four_cubic_star:leaf"
    assert primary["quotient_counts"] == {
        "all_short_total": 3_198_132,
        "all_short_n27_plus": 2_939_106,
        "mixed_rays": 8_091_467,
        "all_long_rays": 1,
        "non_all_short_rays": 8_091_468,
    }

    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_LITERAL_I256_FOUR_CUBIC_STAR_LEAF"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_TREES",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "3198132 2939106 8091467 1 8091468"
    assert rows["UNSEEN"] == "32365872"
    assert rows["LITERAL_TREES"] == str(2_939_106 + 30 * 8_091_468)
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]

    payload = {
        "schema": "rank8-delta03-e4-four-cubic-star-leaf-all-order-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_LEAF_N27_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine rebuilt every literal tree, deleted the actual terminal leaf root, matched both complete primary streams, and checked an unseen S=29 point on every rank-ray.",
        "counts": {
            "all_short_total": 3_198_132,
            "all_short_n27_plus": 2_939_106,
            "mixed_rays": 8_091_467,
            "all_long_rays": 1,
            "non_all_short_rays": 8_091_468,
            "literal_trees_evaluated": 2_939_106 + 30 * 8_091_468,
            "unseen_S29_rank_checks": 32_365_872,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": "checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "compile_command": "rustc --target x86_64-pc-windows-gnu --edition=2021 -O -C overflow-checks=yes",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only four_cubic_star:leaf.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", payload["counts"]["literal_trees_evaluated"], "UNSEEN", rows["UNSEEN"])
    print("STREAM", rows["COEFFICIENT_MERKLE_STREAM"], rows["FINITE_MERKLE_STREAM"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
