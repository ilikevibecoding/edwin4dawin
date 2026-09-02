#!/usr/bin/env python3
"""Fail-closed seal for the independent e=5 quartic-pendant-internal literal audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_newton_reduction_exact_agent_20260823.json": "A3D3CA5B439995B4879DD3B58697821FB8F0604B8A1FB603DA570B8C6765064B",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_exact_agent.py": "20E8D71D06887C6879A160EA0FD05208E4C87A20AA6514D2E921FED717F7416F",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_all_order_exact_agent_20260823.json": "12989599445B745AD6C854C4C52FB2EC5A2CD4E489F861C93B1FDFE24ECD168E",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_literal_i256_agent.rs": "5AA716A8069B9346B0699327264517ADC6A872C7581C8186AAE0E6F51CB122B0",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_literal_i256_agent.exe": "C0A883504A1E686C25158558731DCEF4250B92F147C9570507461DDCC215947C",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_literal_i256_raw_agent_20260823.txt": "98A3F0878CC0E667769C5C5466C731D0E7594A1460B96ACABBC7E87793BE11D1",
}
OBSERVED_AUDIT_RUNTIME_SECONDS = 1155.814


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_AUDIT_RUNTIME_SECONDS is not None
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_PENDANT_INTERNAL_N28_PLUS"
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_PENDANT_INTERNAL"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_TREES",
        "LITERAL_RAY_POINTS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "5445468 4768380 14223523 1 14223524"
    assert rows["UNSEEN"] == "56894096"
    assert rows["LITERAL_TREES"] == "47438952"
    assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-pendant-internal-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_PENDANT_INTERNAL_N28_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine independently enumerated all 19,668,992 keys for a root internal to the quartic pendant, reconstructed the quartic endpoint and two cubic messages, matched every finite record and complete Newton row, and rebuilt every eligible finite tree plus S=0,13,29 on every ray using generic literal forest DP.",
        "root_orbit": "quartic_endpoint_cubic_path:quartic_pendant_internal",
        "counts": {
            "all_short_total": 5_445_468,
            "all_short_n28_plus": 4_768_380,
            "mixed_rays": 14_223_523,
            "all_long_rays": 1,
            "non_all_short_rays": 14_223_524,
            "literal_trees_evaluated": 47_438_952,
            "literal_ray_points": [0, 13, 29],
            "unseen_S29_rank_checks": 56_894_096,
        },
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_audit_runtime_seconds": OBSERVED_AUDIT_RUNTIME_SECONDS,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_endpoint_cubic_path:quartic_pendant_internal for n>=28; no other e=5 orbit is credited.",
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
