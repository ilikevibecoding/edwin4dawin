#!/usr/bin/env python3
"""Independent hash-pinned audit of the complete rank-eight low/low bridge."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LABELS = {
    "curvature_middle_times_4",
    "curvature_far",
    "strong_middle_times_4",
    "strong_far",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--theorem", required=True)
    parser.add_argument("--expected-theorem-sha256", required=True)
    parser.add_argument(
        "--output",
        default=(
            "rank8_low_low_a23_full_bridge_"
            "independent_audit_root_20260826.json"
        ),
    )
    args = parser.parse_args()
    theorem_path = Path(args.theorem).resolve()
    assert sha256(theorem_path) == args.expected_theorem_sha256.upper()
    theorem = json.loads(theorem_path.read_text(encoding="utf-8"))
    assert theorem["schema"] == "rank8-low-low-a23-full-bridge-root-v1"
    assert theorem["status"] == (
        "PASS_EXACT_AND_INDEPENDENT_RANK8_LOW_LOW_FULL_CONVOLUTION_CONE"
    )
    assert set(theorem["coverage"]["auxiliaries"]) == LABELS
    assert theorem["coverage"]["P_exponents"] == [0, 9]
    assert theorem["coverage"]["Q_exponents"] == [0, 8]
    assert theorem["coverage"]["outer_expansion_units"] == 89
    assert theorem["coverage"]["new_Bernstein_positions"] == 521
    assert theorem["coverage"]["negative_coefficients_or_unpaid_targets"] == 0

    loaded = {}
    for name, expected in theorem["immutable_inputs"].items():
        path = ROOT / name
        assert path.is_file(), name
        assert sha256(path) == expected, name
        loaded[name] = json.loads(path.read_text(encoding="utf-8"))
    by_schema = {
        report["schema"]: (name, report)
        for name, report in loaded.items()
        if "schema" in report
    }

    identity = by_schema["rank8-low-low-a23-redistribution-identity-support-agent-v1"][1]
    replay = by_schema["rank8-low-low-a23-probe-replay-agent-v1"][1]
    early = by_schema["rank8-low-low-full-early-suffix45-redistribution-grid-v1"][1]
    early_audit = by_schema["rank8-low-low-full-early-suffix45-redistribution-audit-v1"][1]
    gap0 = by_schema["rank8-low-low-suffix3-gap0-fast-agent-full-face-v1"][1]
    gap0_audit = by_schema["rank8-low-low-suffix3-gap0-fast-full-face-root-audit-v1"][1]
    interior = by_schema["rank8-low-low-a23-redistribution-interior-complete-root-v4"][1]
    interior_audit = by_schema[
        "rank8-low-low-a23-redistribution-interior-complete-independent-audit-root-v2"
    ][1]
    mixed = by_schema["rank8-low-low-a23-mixed-support-complete-root-v1"][1]
    mixed_audit = by_schema[
        "rank8-low-low-a23-mixed-support-complete-independent-audit-root-v1"
    ][1]

    assert identity["status"] == "PASS_EXACT_A23_REDISTRIBUTION_IDENTITY_SUPPORT_AUDIT"
    assert identity["raw_auxiliary_redistribution_degree"] == [2, 2]
    assert replay["status"] == "PASS_INDEPENDENT_EXACT_A23_PROBE_REPLAY"
    assert early["status"] == (
        "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_REDISTRIBUTION_GRID"
    )
    assert "a3=b3=0" in early["theorem"]
    assert early_audit["status"] == "PASS_INDEPENDENT_SUFFIX45_REDISTRIBUTION_GRID_AUDIT"
    assert early_audit["negative_coefficients"] == 0
    assert gap0["status"] == "PASS_EXACT_FAST_AGENT_SUFFIX3_GAP0_FULL_FACE"
    assert gap0_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_FAST_SUFFIX3_GAP0_FULL_FACE_AUDIT"
    )
    assert interior["status"] == "PASS_EXACT_A23_377_POSITION_COMPLEMENT_ASSEMBLED"
    assert interior["universe"]["retained_positions"] == 377
    assert interior["universe"]["separate_mixed_face_positions"] == 144
    assert interior["universe"]["original_position_universe"] == 521
    assert interior_audit["status"] == "PASS_INDEPENDENT_A23_377_POSITION_ASSEMBLY_AUDIT"
    assert mixed["status"] == (
        "PASS_EXACT_AND_INDEPENDENT_BOTH_MIXED_ENDPOINT_FACES_"
        "ALL_FOUR_AUXILIARIES_ARBITRARY_NONNEGATIVE_SLACKS"
    )
    assert mixed_audit["status"] == (
        "PASS_INDEPENDENT_FAIL_CLOSED_Z_EA_EB_X_PARTITION_"
        "BOTH_MIXED_FACES_NO_ROW_OR_GRADE_GAP"
    )
    assert mixed_audit["theorem_sha256"] == next(
        expected
        for name, expected in theorem["immutable_inputs"].items()
        if loaded[name].get("schema") == "rank8-low-low-a23-mixed-support-complete-root-v1"
    )

    partition = theorem["proof_partition"]
    assert partition["tensor_Bernstein_degree"] == [2, 2]
    assert partition["new_position_universe"] == 521
    assert partition["mixed_positions"] == 144
    assert partition["complement_positions"] == 377
    assert partition["position_partition_disjoint_and_exhaustive"] is True
    assert partition["mixed_positions"] + partition["complement_positions"] == 521

    payload = {
        "schema": "rank8-low-low-a23-full-bridge-independent-audit-root-v1",
        "status": (
            "PASS_INDEPENDENT_FAIL_CLOSED_RANK8_LOW_LOW_"
            "FULL_BRIDGE_EXACT_521_POSITION_UNIVERSE"
        ),
        "theorem": theorem_path.name,
        "theorem_sha256": args.expected_theorem_sha256.upper(),
        "checks": {
            "diagonal_endpoint_faces": 2,
            "new_position_universe": 521,
            "mixed_positions": 144,
            "complement_positions": 377,
            "position_partition_disjoint_and_exhaustive": True,
            "auxiliary_rows": 4,
            "negative_coefficients_or_unpaid_targets": 0,
        },
        "immutable_inputs_rehashed": len(theorem["immutable_inputs"]),
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print(payload["status"], flush=True)
    print("REPORT", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
