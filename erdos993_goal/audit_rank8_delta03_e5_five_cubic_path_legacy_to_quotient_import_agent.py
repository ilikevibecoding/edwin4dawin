#!/usr/bin/env python3
"""Independent isolated round-trip audit of the recovery importer."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import scan_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_cuda_rays_agent as legacy_scanner


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_legacy_to_quotient_import_"
    "audit_agent_20260825.json"
)
EXPECTED = {
    "import_rank8_delta03_e5_five_cubic_path_legacy_rays_into_quotient_checkpoint_agent.py":
        "64D0060AE851A9849B560E6722B102FCA9DE62E22632A311EAA9ADFEFC6638C7",
    "scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent.py":
        "73B6757090E16C7B916F2A646D26B9E69F0FB0566843D2694404DF02BFE0B60B",
    "run_rank8_cuda_opposite_half_message_quotient_chunked_rays_driver_agent.py":
        "642DBA783AA5F3AF38A7360AD811036317145406743C9C0B10CE1BA177135DCE",
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_full_batch_qualification_agent_20260825.json":
        "49E6DBCA6E7039E090F8D82D118AB94C4E4CB3F5174E01AA3B1E601D6EE3C3B9",
    "scan_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_cuda_rays_agent.py":
        "D43C13FE0890EA22DC103F466BC741133F3AC244A1991ED4E01D6F9794C4B7EE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    dependencies = {
        name: sha256(ROOT / name) for name in legacy_scanner.EXPECTED
    }
    assert dependencies == legacy_scanner.EXPECTED
    qualification = json.loads(
        (ROOT / (
            "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_"
            "full_batch_qualification_agent_20260825.json"
        )).read_text(encoding="utf-8")
    )["layout_qualifications"]["inner_pendant_internal"]
    legacy_batch = {
        "start": 0,
        "stop": 750_000,
        "patterns": 750_000,
        "rays": qualification["raw_rays"],
        "all_short": qualification["all_short"],
        "finite": qualification["finite"],
        "order27": qualification["order27"],
        **qualification["classifier_statistics"],
        "residue_fingerprint_sha256": (
            qualification["legacy_compatible_residue_fingerprint_sha256"]
        ),
        "elapsed_seconds": 0.0,
    }
    legacy_totals = {
        key: legacy_batch[key]
        for key in (
            "patterns",
            "rays",
            "all_short",
            "finite",
            "order27",
            "gate_failures",
            "bound_failures",
            "negative_classifications",
            "positive_active_coefficients",
            "zero_active_coefficients",
            "zero_degree_overflow_coefficients",
        )
    }
    legacy_state = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-inner-pendant-internal-"
            "cuda-rays-agent-checkpoint-v1"
        ),
        "dependencies": dependencies,
        "batch_size": 750_000,
        "cursor": 750_000,
        "batches": [legacy_batch],
        "totals": legacy_totals,
    }

    with tempfile.TemporaryDirectory(prefix="erdos993_quotient_import_audit_") as raw:
        temporary_root = Path(raw)
        legacy_path = temporary_root / "legacy.json"
        quotient_path = temporary_root / "quotient.json"
        first_report = temporary_root / "first_report.json"
        second_report = temporary_root / "second_report.json"
        legacy_path.write_text(
            json.dumps(legacy_state, indent=2) + "\n", encoding="utf-8"
        )
        legacy_hash = sha256(legacy_path)
        importer = ROOT / (
            "import_rank8_delta03_e5_five_cubic_path_legacy_rays_into_"
            "quotient_checkpoint_agent.py"
        )
        first = subprocess.run(
            [
                sys.executable,
                str(importer),
                "--layout",
                "inner_pendant_internal",
                "--expected-legacy-checkpoint-sha256",
                legacy_hash,
                "--expected-quotient-checkpoint-sha256",
                "ABSENT",
                "--legacy-checkpoint-path",
                str(legacy_path),
                "--quotient-checkpoint-path",
                str(quotient_path),
                "--output-report-path",
                str(first_report),
            ],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        quotient_hash = sha256(quotient_path)
        quotient_state = json.loads(quotient_path.read_text(encoding="utf-8"))
        imported = quotient_state["batches"][0]
        assert quotient_state["cursor"] == 750_000
        assert imported["execution_mode"] == (
            "IMPORTED_SEALED_LEGACY_EXHAUSTIVE_RAW_BATCH"
        )
        assert imported["formula_evaluations"] == imported["rays"]
        assert imported["formula_evaluations_saved"] == 0
        assert imported["raw_multiplicity_sum"] == imported["rays"]
        assert imported["raw_to_group_mapping_sha256"] == (
            qualification["raw_to_group_mapping_sha256"]
        )
        assert imported["residue_fingerprint_sha256"] == (
            qualification["legacy_compatible_residue_fingerprint_sha256"]
        )
        first_payload = json.loads(first_report.read_text(encoding="utf-8"))
        assert first_payload["legacy_batches_imported"] == 1
        assert first_payload[
            "overlap_batches_independently_reconstructed_and_verified"
        ] == 0

        second = subprocess.run(
            [
                sys.executable,
                str(importer),
                "--layout",
                "inner_pendant_internal",
                "--expected-legacy-checkpoint-sha256",
                legacy_hash,
                "--expected-quotient-checkpoint-sha256",
                quotient_hash,
                "--legacy-checkpoint-path",
                str(legacy_path),
                "--quotient-checkpoint-path",
                str(quotient_path),
                "--output-report-path",
                str(second_report),
                "--verify-only",
            ],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        assert sha256(quotient_path) == quotient_hash
        second_payload = json.loads(second_report.read_text(encoding="utf-8"))
        assert second_payload["legacy_batches_imported"] == 0
        assert second_payload[
            "overlap_batches_independently_reconstructed_and_verified"
        ] == 1
        payload = {
            "schema": (
                "rank8-delta03-e5-five-cubic-path-legacy-to-quotient-"
                "import-audit-agent-v1"
            ),
            "status": (
                "PASS_INDEPENDENT_ISOLATED_LEGACY_IMPORT_AND_OVERLAP_"
                "REPLAY_NO_PROOF_SCOPE_CHANGE"
            ),
            "synthetic_input_is_exact_full_batch_qualification_evidence": True,
            "legacy_checkpoint_snapshot_sha256": legacy_hash,
            "imported_quotient_checkpoint_sha256": quotient_hash,
            "imported_cursor": quotient_state["cursor"],
            "imported_raw_rays": imported["rays"],
            "imported_mapping_sha256": imported[
                "raw_to_group_mapping_sha256"
            ],
            "imported_residue_fingerprint_sha256": imported[
                "residue_fingerprint_sha256"
            ],
            "second_pass_overlap_batches_verified": 1,
            "second_pass_left_checkpoint_byte_identical": True,
            "first_import_stdout_sha256": hashlib.sha256(
                first.stdout.encode("utf-8")
            ).hexdigest().upper(),
            "second_verify_stdout_sha256": hashlib.sha256(
                second.stdout.encode("utf-8")
            ).hexdigest().upper(),
            "immutable_input_hashes": actual,
            "source_sha256": sha256(Path(__file__)),
            "scope_guard": (
                "Isolated importer mechanics audit only; no live checkpoint "
                "was opened or modified and no proof credit changed."
            ),
        }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
