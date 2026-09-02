#!/usr/bin/env python3
"""Seal both independent audits for an internal-path quotient primary."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from rank8_delta03_e5_five_cubic_path_internal_quotient_full_stage_config_agent import (
    LAYOUTS,
)


ROOT = Path(__file__).resolve().parent
EXPECTED_SHARED = {
    "rank8_delta03_e5_five_cubic_path_internal_quotient_full_stage_config_agent.py":
        "7A154586039D96D2BCFB9C82267D9854D2206361A65185EB1A6373C54D78BCAE",
    "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_agent.py":
        "993864DBABE869DBAD94E3D77C178EA993A9B40C9461D37389574AF8F1B5126E",
    "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_raw_multiplicity_agent.py":
        "37FDA3CFE1A06DAA1A66CA824D30543D37AACA78BA71E53E77FB59288A4764D8",
    "run_rank8_cuda_full_internal_audit_driver_agent.py":
        "6725E387E7E738F12EABF51F6D437BDAE53CB00242E802E838A8345C4D00A726",
    "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_exact_agent.py":
        "2EE677AEE4FC588963ABAF1386F67D987D6BA6F0C59B15CF6811D8BF69CA73A6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layout", required=True, choices=tuple(LAYOUTS))
    parser.add_argument("--expected-primary-report-sha256", required=True)
    parser.add_argument("--expected-full-raw-audit-sha256", required=True)
    parser.add_argument("--expected-full-audit-checkpoint-sha256", required=True)
    parser.add_argument("--expected-raw-multiplicity-audit-sha256", required=True)
    parser.add_argument(
        "--expected-raw-multiplicity-audit-checkpoint-sha256", required=True
    )
    args = parser.parse_args()
    layout = LAYOUTS[args.layout]
    expected = {
        **EXPECTED_SHARED,
        f"{layout.audit_engine_module}.py": layout.audit_engine_source_sha256,
    }
    actual = {name: sha256(ROOT / name) for name in expected}
    assert actual == expected

    primary_name = (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "all_order_exact_agent_20260825.json"
    )
    full_name = (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "full_independent_audit_agent_20260825.json"
    )
    full_checkpoint_name = (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "full_audit_checkpoint_agent_20260825.json"
    )
    raw_name = (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "raw_multiplicity_audit_agent_20260825.json"
    )
    raw_checkpoint_name = (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "raw_multiplicity_audit_checkpoint_agent_20260825.json"
    )
    dynamic = {
        primary_name: args.expected_primary_report_sha256.upper(),
        full_name: args.expected_full_raw_audit_sha256.upper(),
        full_checkpoint_name: args.expected_full_audit_checkpoint_sha256.upper(),
        raw_name: args.expected_raw_multiplicity_audit_sha256.upper(),
        raw_checkpoint_name:
            args.expected_raw_multiplicity_audit_checkpoint_sha256.upper(),
    }
    assert {name: sha256(ROOT / name) for name in dynamic} == dynamic
    primary = load(primary_name)
    full = load(full_name)
    full_checkpoint = load(full_checkpoint_name)
    raw = load(raw_name)
    raw_checkpoint = load(raw_checkpoint_name)

    assert primary["status"] == layout.exact_seal_status
    assert full["status"] == layout.full_audit_status
    assert full["root_orbit"] == primary["root_orbit"] == layout.root_orbit
    assert full["source_sha256"] == EXPECTED_SHARED[
        "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_agent.py"
    ]
    assert full["driver_sha256"] == EXPECTED_SHARED[
        "run_rank8_cuda_full_internal_audit_driver_agent.py"
    ]
    assert full["checkpoint_sha256"] == dynamic[full_checkpoint_name]
    expected_totals = {
        "patterns": layout.patterns,
        "rays": layout.rays,
        "all_short": layout.all_short,
        "finite": layout.finite,
        "order27": layout.order27,
        "ray_gate_failures": 0,
        "ray_bound_failures": 0,
        "ray_negative_classifications": 0,
        "finite_positive_values": 4 * layout.finite,
        "finite_nonpositive_values": 0,
        "finite_bound_failures": 0,
    }
    assert full["totals"] == full_checkpoint["totals"] == expected_totals
    assert full_checkpoint["cursor"] == layout.patterns
    assert full_checkpoint["dependencies"] == full["immutable_input_hashes"]
    assert full["crt_prime_count"] == 9
    assert full["crt_modulus_bits"] > 255
    for name, expected_hash in full["immutable_input_hashes"].items():
        assert sha256(ROOT / name) == expected_hash, name
    cursor = 0
    for batch in full_checkpoint["batches"]:
        assert batch["start"] == cursor and batch["stop"] > cursor
        assert batch["patterns"] == batch["stop"] - batch["start"]
        assert batch["ray_gate_failures"] == 0
        assert batch["ray_bound_failures"] == 0
        assert batch["ray_negative_classifications"] == 0
        assert batch["finite_nonpositive_values"] == 0
        assert batch["finite_bound_failures"] == 0
        cursor = batch["stop"]
    assert cursor == layout.patterns
    manifest = "".join(
        json.dumps(batch, sort_keys=True, separators=(",", ":")) + "\n"
        for batch in full_checkpoint["batches"]
    )
    assert hashlib.sha256(manifest.encode("utf-8")).hexdigest().upper() == full[
        "batch_manifest_sha256"
    ]

    raw_status = (
        "PASS_INDEPENDENT_RAW_MULTIPLICITY_AUDIT_E5_FIVE_CUBIC_PATH_"
        f"{layout.token}_QUOTIENT_RAYS"
    )
    assert raw["status"] == raw_status
    assert raw["root_orbit"] == layout.root_orbit
    assert raw["audit_checkpoint_sha256"] == dynamic[raw_checkpoint_name]
    assert raw["totals"] == raw_checkpoint["totals"]
    assert raw_checkpoint["quotient_checkpoint_cursor"] == layout.patterns
    assert raw_checkpoint["next_batch_index"] == raw["audited_batches"]
    assert raw["totals"]["patterns"] == layout.patterns
    assert raw["totals"]["raw_rays"] == layout.rays
    assert raw["totals"]["static_raw_rows"] + raw["totals"][
        "dynamic_raw_rows"
    ] == layout.rays
    assert raw["totals"]["imported_legacy_raw_rays"] + raw["totals"][
        "production_quotient_raw_rays"
    ] == layout.rays
    assert primary["quotient_acceleration_evidence"][
        "raw_multiplicity_audit_sha256"
    ] == dynamic[raw_name]
    assert primary["quotient_counts"]["canonical_coordinate_patterns"] == (
        layout.patterns
    )
    assert primary["quotient_counts"]["mixed_and_all_long_rays"] == layout.rays
    assert primary["quotient_counts"]["all_short_n28_plus"] == layout.finite

    output = ROOT / (
        f"rank8_delta03_e5_five_cubic_path_{layout.name}_cuda_quotient_"
        "all_order_independent_audit_agent_20260825.json"
    )
    payload = {
        "schema": (
            f"rank8-delta03-e5-five-cubic-path-{layout.name.replace('_', '-')}"
            "-cuda-quotient-all-order-independent-audit-agent-v1"
        ),
        "status": layout.independent_seal_status,
        "root_orbit": layout.root_orbit,
        "audit_claim": (
            "Two disjoint gates passed: an independent raw mapping/"
            "multiplicity replay recovered every original quotient ray, and "
            "a separately transcribed path-message engine with a disjoint "
            "nine-prime CRT basis exhaustively replayed every raw ray and "
            "finite cell without a sign, gate, or magnitude-bound failure."
        ),
        "totals": expected_totals,
        "raw_multiplicity_totals": raw["totals"],
        "matching_primary_workload": {
            "canonical_coordinate_patterns": layout.patterns,
            "n28_plus_newton_rays": layout.rays,
            "n28_plus_finite": layout.finite,
            "exact_match": True,
        },
        "batch_manifest_sha256": full["batch_manifest_sha256"],
        "raw_multiplicity_audit_sha256": dynamic[raw_name],
        "immutable_input_hashes": {
            **actual,
            **dynamic,
            **full["immutable_input_hashes"],
            **raw["immutable_input_hashes"],
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            f"Audit credits exactly {layout.root_orbit} for n>=28; it does "
            "not infer any orbit equivalence from quotient grouping."
        ),
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
