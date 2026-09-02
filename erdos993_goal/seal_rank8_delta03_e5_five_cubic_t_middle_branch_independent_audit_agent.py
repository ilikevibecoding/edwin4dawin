#!/usr/bin/env python3
"""Fail-closed seal for the independent five-cubic-T middle-branch audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_five_cubic_t_middle_branch_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_five_cubic_t_middle_branch_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_middle_branch_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_five_cubic_t_middle_branch_newton_reduction_exact_agent_20260823.json": "0181BED93E802DE77C5AED6CF0A3789D32701FA9FC4ED0CB9DAEE0B9E42DFD4D",
    "seal_rank8_delta03_e5_five_cubic_t_middle_branch_exact_agent.py": "6D05C941FE30FFD29C613E330EDBB0AEC1812E0268F5DE40BA626AA27F73198B",
    "rank8_delta03_e5_five_cubic_t_middle_branch_all_order_exact_agent_20260823.json": "76D6BD574B4878F158AD088698D47EEF57FB93C5EF315CDA973D479A8F90AEBD",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_five_cubic_t_middle_branch_literal_i256_agent.rs": "49383359F4D6441913B7D6C57261EC90FA0CACE37FB5DB29386E973D13A486FF",
    "audit_rank8_delta03_e5_five_cubic_t_middle_branch_literal_i256_agent.exe": "6F613CC7B0C3E281699BD07D32B9AF40AB123BA2927E8D5284F611FCDA16D60C",
    "rank8_delta03_e5_five_cubic_t_middle_branch_literal_i256_raw_agent_20260823.txt": "A71926A47E6C8A70B7090E34C396F793A4183F7CADC3FA4E4E18970FB9917D8F",
}
OBSERVED_AUDIT_RUNTIME_SECONDS = 18_465


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_AUDIT_RUNTIME_SECONDS is not None
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_MIDDLE_BRANCH_N28_PLUS"
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_MIDDLE_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_TREES",
        "LITERAL_RAY_POINTS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "67160772 66375425 248948027 1 248948028"
    assert rows["UNSEEN"] == "995792112"
    assert rows["LITERAL_TREES"] == "813219509"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-middle-branch-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_T_MIDDLE_BRANCH_N28_PLUS_AUDIT",
        "audit_claim": "A separately compiled and transcribed checked-i256 engine independently enumerated all 316,108,800 canonical keys, matched every finite record and Newton row, and rebuilt every eligible finite tree plus S=0,13,29 on every ray with generic literal forest DP.",
        "root_orbit": "five_cubic_t:middle_branch",
        "counts": {
            "all_short_total": 67_160_772,
            "all_short_n28_plus": 66_375_425,
            "mixed_rays": 248_948_027,
            "all_long_rays": 1,
            "non_all_short_rays": 248_948_028,
            "literal_trees_evaluated": 813_219_509,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 995_792_112,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_audit_runtime_seconds": OBSERVED_AUDIT_RUNTIME_SECONDS,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic, checked i128 independence-vector arithmetic, and constant-memory ordered shard digests",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only five_cubic_t:middle_branch for n>=28; no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("STREAM", payload["matching_coefficient_merkle_stream_sha256"], payload["matching_finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
