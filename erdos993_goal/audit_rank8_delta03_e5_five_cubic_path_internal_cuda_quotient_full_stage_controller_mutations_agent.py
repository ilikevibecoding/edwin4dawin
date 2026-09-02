#!/usr/bin/env python3
"""Mutation audit for the dormant quotient full-stage PowerShell controller."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CONTROLLER = ROOT / (
    "drive_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_"
    "full_stage_v2_root.ps1"
)
CONTROLLER_SHA256 = (
    "F5F520A1B1002608128DE41DA8E5E48A1DE3908EF7E0EA9C8C0D296FF1ECDD19"
)
QUALIFICATION_REPORT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_stage_"
    "controller_qualification_agent_20260825.json"
)
QUALIFICATION_REPORT_SHA256 = (
    "3E0B8F88E434FC64A93FD2D204686FE6E8EDD336AD2D55D999C79EFB4FC27F17"
)
FIXTURE_ROOT = ROOT / "_quotient_full_stage_qualification" / "controller"
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_stage_"
    "controller_mutation_audit_agent_20260825.json"
)
MUTATIONS = {
    "bad_predecessor": "predecessor script hash mismatch",
    "competitor": "competing proof process detected",
    "bad_order": "stage order mismatch at index 1",
    "partial_status": "qualification status mismatch at RAW_MULTIPLICITY",
    "missing_full_audit": "stage sequence length mismatch",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def run_fixture(
    name: str, layout: str = "inner_pendant_internal"
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            "pwsh",
            "-NoProfile",
            "-File",
            str(CONTROLLER),
            "-Layout",
            layout,
            "-QualificationManifestPath",
            str(FIXTURE_ROOT / f"{name}.json"),
        ],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )


def main() -> None:
    assert sha256(CONTROLLER) == CONTROLLER_SHA256
    assert sha256(QUALIFICATION_REPORT) == QUALIFICATION_REPORT_SHA256
    qualification = json.loads(QUALIFICATION_REPORT.read_text(encoding="utf-8"))
    assert qualification["status"] == (
        "PASS_CONTROLLER_QUALIFICATION_NO_PROOF_CREDIT"
    )
    assert qualification["source_sha256"] == CONTROLLER_SHA256
    assert qualification["predecessor_identity_enforced"] is True
    assert qualification["competing_process_guard_enforced"] is True
    assert qualification["enforced_stage_order"] == [
        "RAYS",
        "FINITE",
        "RAW_MULTIPLICITY",
        "PRIMARY",
        "EXACT_SEAL",
        "FULL_RAW_AUDIT",
        "DUAL_AUDIT_SEAL",
        "N27_FINAL",
    ]

    valid_layouts = {}
    for layout in (
        "inner_pendant_internal",
        "inner_spine_internal",
        "outer_spine_internal",
        "outer_pendant_internal",
    ):
        fixture_name = "valid" if layout == "inner_pendant_internal" else f"valid_{layout}"
        valid = run_fixture(fixture_name, layout)
        assert valid.returncode == 0, (layout, valid.stdout)
        assert "PASS_CONTROLLER_QUALIFICATION_NO_PROOF_CREDIT" in valid.stdout
        valid_layouts[layout] = {
            "exit_code": valid.returncode,
            "accepted": True,
            "fixture_sha256": sha256(FIXTURE_ROOT / f"{fixture_name}.json"),
        }
    mutation_results = {}
    for name, expected_message in MUTATIONS.items():
        result = run_fixture(name)
        assert result.returncode != 0, name
        assert expected_message in result.stdout, (name, result.stdout)
        mutation_results[name] = {
            "exit_code": result.returncode,
            "expected_rejection": expected_message,
            "rejected": True,
            "fixture_sha256": sha256(FIXTURE_ROOT / f"{name}.json"),
        }

    source = CONTROLLER.read_text(encoding="utf-8")
    for required in (
        "ray controller predecessor is not live at controller start",
        "Assert-PredecessorRecord $predecessorRecord",
        "$RayControllerProcessId = 0",
        "Assert-NoCompetingProofProcess",
        "FULL_STAGE_LOCK_ACQUIRED",
        "finite hard stop after $noProgress no-progress exits",
        "raw multiplicity hard stop after $noProgress no-progress exits",
        "full audit hard stop after $noProgress no-progress exits",
        "Assert-StageSequence $completedStages",
        "immutable quotient ray pair drifted during full stage",
    ):
        assert required in source
    for forbidden in ("Stop-Process", ".Kill(", "taskkill", "Remove-Item"):
        assert forbidden not in source

    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-internal-cuda-quotient-"
            "full-stage-controller-mutation-audit-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_MUTATION_AUDIT_QUOTIENT_FULL_STAGE_"
            "CONTROLLER_NO_PROOF_CREDIT"
        ),
        "controller_sha256": CONTROLLER_SHA256,
        "valid_layout_fixtures": valid_layouts,
        "mutation_results": mutation_results,
        "production_safety_checks": {
            "live_predecessor_identity_required": True,
            "double_launch_process_scan_required": True,
            "exclusive_full_stage_lock_required": True,
            "three_no_progress_hard_stop_per_segmented_stage": True,
            "exact_stage_order_checked_before_success": True,
            "ray_pair_immutability_rechecked_before_success": True,
            "no_process_kill_or_artifact_delete_operation": True,
        },
        "immutable_input_hashes": {
            CONTROLLER.name: CONTROLLER_SHA256,
            QUALIFICATION_REPORT.name: QUALIFICATION_REPORT_SHA256,
            **{
                str((FIXTURE_ROOT / f"{name}.json").relative_to(ROOT)):
                    sha256(FIXTURE_ROOT / f"{name}.json")
                for name in ("valid", *MUTATIONS)
            },
            **{
                str((FIXTURE_ROOT / f"valid_{layout}.json").relative_to(ROOT)):
                    sha256(FIXTURE_ROOT / f"valid_{layout}.json")
                for layout in (
                    "inner_spine_internal",
                    "outer_spine_internal",
                    "outer_pendant_internal",
                )
            },
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Controller engineering audit only. Qualification mode launches "
            "no scanner and mutation fixtures carry no mathematical credit. "
            "The controller remains dormant and unarmed."
        ),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
